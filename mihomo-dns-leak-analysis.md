# Análise de Vazamento DNS/IP — mihomo + MikroTik

Setup analisado:
- **Servidor mihomo:** `192.168.60.139` (DNS em `:1053`, TUN com fake-ip `198.18.0.0/16`)
- **Cliente alvo:** `192.168.60.133` (roteado via proxy `pc133`)
- **MikroTik:** dstnat redirecionando UDP/53 do `.133` para o mihomo

---

## Problema 1 — DNS sobre TCP/53 não é interceptado

### Explicação
A regra dstnat atual no MikroTik filtra apenas `protocol=17 (udp)`. Quando uma resposta DNS vem com flag TC (truncated) ou quando o resolver decide usar TCP por outros motivos, o cliente faz a consulta em TCP/53. Esse tráfego passa direto pelo MikroTik para o upstream, sem ser desviado pro mihomo. Resultado: o servidor DNS público vê a consulta vinda do IP real do cliente.

### Como resolver
Adicione uma regra dstnat espelhada para TCP/53 no MikroTik:

```routeros
/ip firewall nat add chain=dstnat \
    src-address=192.168.60.133 \
    protocol=tcp dst-port=53 \
    action=dst-nat \
    to-addresses=192.168.60.139 to-ports=1053
```

Passo a passo no Winbox:
1. Abra **IP → Firewall → NAT**.
2. Clique em `+` para criar nova regra.
3. Aba **General**: `Chain=dstnat`, `Src.Address=192.168.60.133`, `Protocol=6 (tcp)`, `Dst.Port=53`.
4. Aba **Action**: `Action=dst-nat`, `To Addresses=192.168.60.139`, `To Ports=1053`.
5. Clique **OK** e mova a regra para acima de qualquer regra mais genérica.

### Como validar
No servidor mihomo, rode:
```bash
tcpdump -i any -n 'host 192.168.60.133 and port 53'
```
E no cliente force uma consulta TCP:
```bash
dig @1.1.1.1 +tcp example.com
```
A consulta deve aparecer chegando no mihomo (porta 1053), não saindo direto pra `1.1.1.1`.

---

## Problema 2 — Conexões diretas por IP (hardcoded) vazam totalmente

### Explicação
**Esse é o furo mais sério do setup.** A regra do mihomo `SRC-IP-CIDR,192.168.60.133/32,pc133` só atua se o pacote *chegar* ao mihomo. Hoje o tráfego do cliente só é desviado pro mihomo quando:
- É uma consulta DNS (interceptada pelo dstnat)
- O destino está na faixa fake-ip `198.18.0.0/16` (porque o MikroTik tem rota pra essa faixa apontando pro `.139`)

Qualquer aplicação que conecta direto num IP público (sem fazer DNS) escapa completamente. Exemplos comuns:
- Telemetria com IPs hardcoded
- Clientes P2P, BitTorrent, jogos online
- DoH/DoT bootstrap (Chrome/Firefox tentam `1.1.1.1:443` ou `8.8.8.8:443` antes de qualquer DNS)
- WebRTC/STUN com servidores conhecidos
- Ferramentas de linha de comando: `ping 1.1.1.1`, `ssh user@<ip>`, `curl https://<ip>`

Esses pacotes saem pelo gateway default do MikroTik, expondo o IP público real do cliente.

### Como resolver — Opção A (recomendada): forçar todo tráfego pelo mihomo

Use policy routing no MikroTik para mandar tudo do `.133` para o `.139`:

```routeros
# Marca o tráfego do cliente
/ip firewall mangle add chain=prerouting \
    src-address=192.168.60.133 \
    action=mark-routing new-routing-mark=via-mihomo \
    passthrough=no

# Cria tabela de roteamento que sai pelo mihomo
/ip route add dst-address=0.0.0.0/0 \
    gateway=192.168.60.139 \
    routing-mark=via-mihomo
```

Pré-requisitos no servidor mihomo:
- `tun.enable: true` e `tun.auto-route: true` (você já tem)
- IP forwarding ativo: `sysctl -w net.ipv4.ip_forward=1` (persistente em `/etc/sysctl.conf`)
- SNAT/MASQUERADE para o tráfego que sai pela TUN (geralmente o mihomo já cuida com `auto-route`, mas confira com `iptables -t nat -L POSTROUTING`)

### Como resolver — Opção B: bloquear qualquer saída que não seja pro mihomo

Mais restritiva, faz apps quebrarem em vez de vazar (preferível para máxima segurança):

```routeros
# Permite tráfego local LAN
/ip firewall filter add chain=forward \
    src-address=192.168.60.133 \
    dst-address=192.168.60.0/24 \
    action=accept comment="LAN local OK"

# Permite tráfego pro mihomo e para a faixa fake-ip
/ip firewall filter add chain=forward \
    src-address=192.168.60.133 \
    dst-address=192.168.60.139 \
    action=accept comment="mihomo OK"

/ip firewall filter add chain=forward \
    src-address=192.168.60.133 \
    dst-address=198.18.0.0/16 \
    action=accept comment="fake-ip OK"

# Bloqueia o resto
/ip firewall filter add chain=forward \
    src-address=192.168.60.133 \
    action=drop comment="Bloqueia vazamento direto por IP"
```

Coloque essas regras **antes** das regras genéricas de forward.

### Como resolver — Opção C: mitigação parcial

Se não quiser mexer em rota/firewall agora, no mínimo adicione regras dstnat redirecionando portas comuns de DNS encriptado (DoT/DoH bootstrap) pro mihomo. Não cobre apps com IP hardcoded em outras portas:

```routeros
/ip firewall nat add chain=dstnat \
    src-address=192.168.60.133 \
    protocol=tcp dst-port=853 \
    action=dst-nat to-addresses=192.168.60.139 to-ports=1053
```

### Como validar
Do cliente, tente conectar diretamente num IP público:
```bash
curl -v https://1.1.1.1
ping 8.8.8.8
```
Em outra janela, no servidor mihomo, observe se essas conexões chegam (`tcpdump -i any host 192.168.60.133`). Se aparecerem em `eth0` indo pra fora **sem passar pela interface Meta**, ainda há vazamento.

Como teste definitivo: acesse `https://browserleaks.com/ip` ou `https://ipleak.net` no cliente. O IP público mostrado deve ser o do proxy `pc133`, não o seu IP real.

---

## Problema 3 — Tráfego intra-LAN para destino não-padrão

### Explicação
No Torch apareceu `192.168.60.133:5900 → 192.168.251.2:55248` com 671 kbps (sessão VNC). A faixa `192.168.251.0/24` não é a LAN principal (`192.168.60.0/24`). Se essa rede secundária não é confiável, esse é um canal de saída que não passa pelo mihomo.

### Como resolver
1. Identifique se `192.168.251.0/24` é uma rede legítima (VPN site-to-site, segmento de gerência, etc.).
2. Se for legítima e confiável: documente e libere explicitamente.
3. Se não for esperada: bloqueie no MikroTik:

```routeros
/ip firewall filter add chain=forward \
    src-address=192.168.60.133 \
    dst-address=192.168.251.0/24 \
    action=drop comment="Bloqueia segmento não-confiável"
```

Se você adotou a **Opção B** do Problema 2, essa rede já fica bloqueada automaticamente (só `192.168.60.0/24` é liberada).

### Como validar
Reabra o Torch filtrando por `Src.Address=192.168.60.133` e confirme que não há mais tráfego saindo para `192.168.251.0/24`.

---

## Problema 4 — DoH dos navegadores pode contornar o fake-ip

### Explicação
Chrome/Edge/Firefox podem ativar DoH automaticamente. Em alguns casos eles usam IPs bootstrap hardcoded para alcançar o servidor DoH (ex: `1.1.1.1:443`, `8.8.8.8:443`). Quando isso acontece, não há consulta DNS para o fake-ip interceptar — a conexão TLS sai direto pro IP público.

Mesmo que o navegador resolva o hostname via DNS (passando pelo fake-ip), uma vez conectado o canal DoH é opaco e suas resoluções subsequentes não são visíveis pro mihomo, então tudo que vier depois fica fora do controle do roteamento por regras (mas ainda passa pelo proxy se você adotou a Opção A/B).

### Como resolver
1. **Desabilite DoH nos navegadores do cliente:**
   - Chrome: `chrome://settings/security` → "Use secure DNS" → **Off**
   - Firefox: `about:preferences#privacy` → "DNS over HTTPS" → **Off**
   - Edge: `edge://settings/privacy` → "Use secure DNS" → **Off**

2. **Aplicar via política (Windows GPO ou registro):**
   ```
   HKLM\Software\Policies\Google\Chrome\DnsOverHttpsMode = "off"
   HKLM\Software\Policies\Microsoft\Edge\DnsOverHttpsMode = "off"
   ```

3. **Reforço no MikroTik:** se adotou a Opção B, conexões pra IPs hardcoded de DoH já são bloqueadas. Se está na Opção A, elas serão proxificadas (mas o conteúdo segue opaco).

### Como validar
Acesse `https://1.1.1.1/help` no cliente. A página mostra se você está usando DoH ou não. Deve indicar "No" para o teste de DoH.

---

## Checklist final de proteção

Marque conforme implementar:

- [ ] Regra dstnat para TCP/53 adicionada (Problema 1)
- [ ] Policy routing OU firewall filter forçando todo tráfego do `.133` pelo mihomo (Problema 2)
- [ ] IP forwarding ativo no servidor mihomo
- [ ] Tráfego para `192.168.251.0/24` validado ou bloqueado (Problema 3)
- [ ] DoH desabilitado nos navegadores (Problema 4)
- [ ] Teste em `browserleaks.com/ip` mostrando IP do proxy `pc133`
- [ ] Teste em `dnsleaktest.com` (Extended Test) mostrando apenas servidores DNS upstream do mihomo
- [ ] `tcpdump` no servidor confirmando que não há saída direta do `.133` pro internet sem passar pela TUN

---

## Comandos úteis para diagnóstico contínuo

```bash
# No servidor mihomo: ver todo tráfego do cliente em tempo real
tcpdump -i any -n host 192.168.60.133

# Ver conexões ativas que o mihomo está proxificando
curl http://192.168.60.139:9090/connections | jq

# Ver se há consultas DNS chegando no mihomo
tcpdump -i any -n 'port 1053'

# No MikroTik: contadores das regras NAT (para ver se TCP/53 está sendo usado)
/ip firewall nat print stats where comment~"DNS"
```
