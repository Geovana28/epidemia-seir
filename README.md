# 🦠 Simulador de Epidemia SEIR

Modelo epidemiológico SEIR (Suscetível-Exposto-Infectado-Recuperado) com cenários de surtos reais e simulação de intervenções de saúde pública.

## 🚀 Funcionalidades

- **Simulação Estocástica de Trajetórias (Gillespie / Tau-Leaping)** — Modelagem de flutuações discretas em populações finitas com faixas de confiança interquartis.
- **Número Efetivo de Reprodução $R(t)$ em Tempo Real** — Monitoramento do limiar de extinção da epidemia ($R(t) < 1.0$).
- **4 Cenários de Surto Calibrados** — COVID-19, Influenza, Sarampo, Ebola
- **Compartimentos S-E-I-R** — Dinâmica temporal acoplada via Runge-Kutta de 4ª Ordem (RK4)
- **Intervenções Não-Farmacológicas (NPIs)** — Distanciamento social, máscaras e cobertura vacinal com perda de imunidade
- **Limiar Crítico de Colapso de Leitos de UTI** — Cálculo de demanda de ventilação mecânica

## 🧮 Modelagem Matemática & Dinâmica Não-Linear

### 1. Sistema de Equações Diferenciais Ordinárias (SEIR Clássico)

$$\begin{aligned}
\frac{dS}{dt} &= -\frac{\beta(t) S I}{N} - \nu S \\
\frac{dE}{dt} &= \frac{\beta(t) S I}{N} - \sigma E \\
\frac{dI}{dt} &= \sigma E - \gamma I \\
\frac{dR}{dt} &= \gamma I + \nu S
\end{aligned}$$

### 2. Número Efetivo de Reprodução $R(t)$ & Imunidade de Rebanho

$$R(t) = R_0 \cdot \frac{S(t)}{N} \cdot (1 - \epsilon_{\text{intervenção}}), \quad I_c = 1 - \frac{1}{R_0}$$

## 🛠️ Tecnologias

- JavaScript Vanilla (ES6+)
- Chart.js
- CSS3 com design premium
- Google Fonts (Inter, JetBrains Mono)

## 📦 Como Executar

Abra `index.html` no navegador — Chart.js carregado via CDN.

## 📁 Estrutura

```
epidemia-seir/
├── index.html    # Layout e controles
├── script.js     # Motor de simulação SEIR
└── style.css     # Design premium dark theme
```

## ⚠️ Hipóteses do Modelo e Limitações

1. **Conservação Populacional e Mistura Homogênea**: Assume população total constante ($S + E + I + R = N$) no horizonte de curto prazo e probabilidade uniforme de contato entre indivíduos.
2. **Tempos de Residência Exponenciais**: A formulação por EDOs de primeira ordem implica tempos de incubação ($\sigma^{-1}$) e infecciosidade ($\gamma^{-1}$) exponencialmente distribuídos.
3. **Aproximação Estocástica**: As trajetórias estocásticas utilizam aproximação *tau-leaping* discreta para ilustrar variância demográfica em subpopulações finitas.

---

Desenvolvido por **Geovana** | Distribuído sob Licença MIT (`LICENSE`) | [Portfólio](../portfolio/index.html)
