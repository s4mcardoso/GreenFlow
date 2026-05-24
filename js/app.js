/**
 * GreenFlow - Lógica Principal (SPA)
 */

const app = {
    // Variável para guardar a instância do gráfico e destruí-la ao recriar
    chartInstance: null,
    
    // Dados da simulação atual
    currentSimulation: null,

    // Inicialização
    init() {
        // Oculta todas as views
        document.querySelectorAll('.spa-view').forEach(view => {
            view.classList.remove('active');
        });
        
        // Mostra a view inicial baseada no hash da URL ou 'home'
        const hash = window.location.hash.replace('#', '') || 'home';
        this.navigate(hash, false);

        // Listener para navegação pelo botão de voltar do navegador
        window.addEventListener('popstate', () => {
            const hash = window.location.hash.replace('#', '') || 'home';
            this.navigate(hash, false);
        });
    },

    // Navegação da SPA
    navigate(viewName, pushState = true) {
        // Esconde todas as views
        document.querySelectorAll('.spa-view').forEach(view => {
            view.classList.remove('active');
        });

        // Atualiza botões da navbar
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        const navLink = document.getElementById(`nav-${viewName}`);
        if(navLink) navLink.classList.add('active');

        // Mostra a view selecionada
        const targetView = document.getElementById(`view-${viewName}`);
        if(targetView) {
            targetView.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Fecha menu mobile se estiver aberto
        const navbarCollapse = document.getElementById('navbarNav');
        if (navbarCollapse && navbarCollapse.classList.contains('show')) {
            const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
            if (bsCollapse) bsCollapse.hide();
        }

        // Atualiza URL sem recarregar
        if (pushState) {
            history.pushState(null, null, `#${viewName}`);
        }
    },

    // Lógica de Cálculo
    calculateResults(event) {
        event.preventDefault();

        // Pegar valores do formulário
        const valorConta = parseFloat(document.getElementById('input-conta').value);
        const tarifa = parseFloat(document.getElementById('input-tarifa').value);
        
        // Dados do Veículo Elétrico (EV)
        const hasEV = document.getElementById('input-ev-toggle').checked;
        const evKm = parseFloat(document.getElementById('input-ev-km').value) || 0;

        if (isNaN(valorConta) || valorConta <= 0) {
            alert('Por favor, insira um valor válido para a conta.');
            return;
        }

        // 1. Cálculos Base
        // Consumo em kWh = Valor / Tarifa
        let consumoMensalKwh = valorConta / tarifa;
        
        // Cálculo adicional do EV
        let custoEVMensal = 0;
        if (hasEV && evKm > 0) {
            // Média de 0.18 kWh consumidos por km rodado
            const consumoEVMensalKwh = evKm * 0.18;
            custoEVMensal = consumoEVMensalKwh * tarifa;
            
            // Adiciona o consumo extra no consumo mensal para dimensionar o sistema solar
            consumoMensalKwh += consumoEVMensalKwh;
        }

        // Nova conta base projetada (com o custo adicional do EV, se houver)
        const valorContaProjetada = valorConta + custoEVMensal;

        // 2. Economia Mensal (75% de redução sobre a conta projetada, pois o sistema cobrirá esse excedente)
        const economiaMensal = valorContaProjetada * 0.75;
        const economiaAnual = economiaMensal * 12;

        // 3. Custo de Instalação (Estimativa baseada no consumo TOTAL dimensionado)
        // Aproximação: custo médio = R$ 40 por kWh/mês de consumo
        const investimento = consumoMensalKwh * 40;

        // 4. Payback (Anos) = Investimento / Economia Anual
        const paybackAnos = investimento / economiaAnual;
        
        // 5. Impacto Ambiental
        // Fator de emissão médio no Brasil (~0.082 kg CO2 / kWh)
        const co2EvitadoMes = (consumoMensalKwh * 0.75) * 0.082;
        const co2EvitadoAno = co2EvitadoMes * 12;
        const arvoresPorAno = Math.round(co2EvitadoAno / 20); // 1 árvore absorve ~20kg de CO2/ano

        // Economia em 20 anos
        const economia20Anos = economiaAnual * 20;

        // Salvar em memória
        this.currentSimulation = {
            contaBase: valorContaProjetada,
            investimento: investimento,
            economiaMensal: economiaMensal,
            economiaAnual: economiaAnual,
            paybackAnos: paybackAnos,
            co2Ano: co2EvitadoAno
        };

        // Renderizar na tela
        this.renderResults(valorContaProjetada, investimento, economiaMensal, paybackAnos, co2EvitadoAno, economia20Anos, arvoresPorAno);

        // Renderizar Gráfico
        this.renderChart(investimento, economiaAnual);

        // Navegar para resultados
        this.navigate('result');
    },

    // Formatação de Moeda
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    },

    // Atualiza o HTML com os resultados
    renderResults(conta, invest, econMes, pbAnos, co2, econ20a, arvores) {
        document.getElementById('res-conta-base').innerText = this.formatCurrency(conta);
        document.getElementById('res-investimento').innerText = this.formatCurrency(invest);
        document.getElementById('res-economia-mes').innerText = this.formatCurrency(econMes);
        
        // Formata Payback (ex: 3 Anos e 4 Meses)
        const anosInt = Math.floor(pbAnos);
        const mesesRestantes = Math.round((pbAnos - anosInt) * 12);
        let pbText = `${anosInt} Anos`;
        if (mesesRestantes > 0) pbText += ` e ${mesesRestantes} Meses`;
        document.getElementById('res-payback').innerText = pbText;

        document.getElementById('res-co2').innerText = `${co2.toFixed(1)} kg`;
        document.getElementById('res-economia-20a').innerText = this.formatCurrency(econ20a);
        document.getElementById('res-arvores').innerText = arvores;
        
        // Esconder feedback de save anterior
        document.getElementById('save-feedback').classList.add('d-none');
    },

    // Renderiza gráfico com Chart.js
    renderChart(investimento, economiaAnual) {
        const ctx = document.getElementById('paybackChart').getContext('2d');

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const labels = Array.from({length: 11}, (_, i) => `Ano ${i}`); // Ano 0 a 10
        
        // Arrays de dados
        const custoInvestimento = Array(11).fill(investimento);
        const economiaAcumulada = labels.map((_, index) => economiaAnual * index);

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Economia Acumulada',
                        data: economiaAcumulada,
                        borderColor: '#2b7a4b', // green primary
                        backgroundColor: 'rgba(43, 122, 75, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.1
                    },
                    {
                        label: 'Custo do Investimento',
                        data: custoInvestimento,
                        borderColor: '#f5b041', // gold
                        borderWidth: 2,
                        borderDash: [5, 5], // linha tracejada
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value / 1000 + 'k';
                            }
                        }
                    }
                }
            }
        });
    },

    // Simula salvamento no banco de dados (conforme item 5.1.2 Backend Node/Express)
    saveSimulation() {
        if (!this.currentSimulation) return;

        // Aqui seria feita a chamada POST real para a API (ex: /salvar)
        // Como o foco é o front-end, vamos simular a requisição com fetch
        
        console.log("Enviando dados para a API:", this.currentSimulation);
        
        // Simula o tempo de rede
        const btn = document.querySelector('button[onclick="app.saveSimulation()"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Salvando...';
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            
            // Exibir mensagem de sucesso
            const feedback = document.getElementById('save-feedback');
            feedback.classList.remove('d-none');
            
            // Esconde após 3 segundos
            setTimeout(() => {
                feedback.classList.add('d-none');
            }, 3000);
            
        }, 800);
    }
};

// Iniciar a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
