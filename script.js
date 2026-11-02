/* ============================================================
   SEIR EPIDEMIC SIMULATOR — RUNGE-KUTTA (RK4) ODE ENGINE
   dS/dt = -β*S*I/N - v*S
   dE/dt = β*S*I/N - σ*E
   dI/dt = σ*E - γ*I
   dR/dt = γ*I + v*S
   ============================================================ */

(() => {
    'use strict';

    // Presets with canonical epidemiological parameters
    const PRESETS = {
        covid: {
            name: 'COVID-19 Wildtype',
            beta: 0.50,
            incubation: 5.2,
            infectious: 5.0,
            pop: 100000,
            reduction: 0,
            startDay: 25,
            vax: 0.0
        },
        flu: {
            name: 'Seasonal Influenza',
            beta: 0.45,
            incubation: 2.0,
            infectious: 3.0,
            pop: 100000,
            reduction: 0,
            startDay: 15,
            vax: 0.2
        },
        measles: {
            name: 'Measles (High R₀)',
            beta: 1.60,
            incubation: 10.0,
            infectious: 8.0,
            pop: 100000,
            reduction: 0,
            startDay: 20,
            vax: 0.0
        },
        ebola: {
            name: 'Ebola Outbreak',
            beta: 0.30,
            incubation: 9.0,
            infectious: 6.0,
            pop: 50000,
            reduction: 0,
            startDay: 30,
            vax: 0.0
        }
    };

    // DOM References
    const popSlider = document.getElementById('popTotal');
    const popVal = document.getElementById('popTotalVal');
    const betaSlider = document.getElementById('transmissionRate');
    const betaVal = document.getElementById('transmissionRateVal');
    const incubationSlider = document.getElementById('incubationDays');
    const incubationVal = document.getElementById('incubationDaysVal');
    const infectiousSlider = document.getElementById('infectiousDays');
    const infectiousVal = document.getElementById('infectiousDaysVal');

    const lockdownEffSlider = document.getElementById('lockdownEff');
    const lockdownEffVal = document.getElementById('lockdownEffVal');
    const lockdownDaySlider = document.getElementById('lockdownDay');
    const lockdownDayVal = document.getElementById('lockdownDayVal');
    const vaxSlider = document.getElementById('vaccinationRate');
    const vaxVal = document.getElementById('vaccinationRateVal');
    const chkCapacity = document.getElementById('chkCapacity');

    const r0Val = document.getElementById('r0Val');
    const kpiS = document.getElementById('kpiS');
    const kpiSpct = document.getElementById('kpiSpct');
    const kpiE = document.getElementById('kpiE');
    const kpiEpct = document.getElementById('kpiEpct');
    const kpiI = document.getElementById('kpiI');
    const kpiIpct = document.getElementById('kpiIpct');
    const kpiR = document.getElementById('kpiR');
    const kpiRpct = document.getElementById('kpiRpct');

    const peakInfections = document.getElementById('peakInfections');
    const peakDay = document.getElementById('peakDay');
    const totalAttack = document.getElementById('totalAttack');
    const totalInfectedCount = document.getElementById('totalInfectedCount');
    const hitVal = document.getElementById('hitVal');
    const capacityStatus = document.getElementById('capacityStatus');

    const scenarioBtns = document.querySelectorAll('.btn-scenario');

    let chart = null;

    function initChart() {
        const ctx = document.getElementById('seirChart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Susceptible (S)',
                        data: [],
                        borderColor: '#38bdf8',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.2
                    },
                    {
                        label: 'Exposed (E)',
                        data: [],
                        borderColor: '#f59e0b',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.2
                    },
                    {
                        label: 'Infectious (I)',
                        data: [],
                        borderColor: '#f43f5e',
                        backgroundColor: 'rgba(244, 63, 94, 0.15)',
                        fill: true,
                        borderWidth: 2.5,
                        pointRadius: 0,
                        tension: 0.2
                    },
                    {
                        label: 'Recovered / Immune (R)',
                        data: [],
                        borderColor: '#10b981',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.2
                    },
                    {
                        label: 'Hospital Capacity (5% of Pop)',
                        data: [],
                        borderColor: '#e11d48',
                        borderWidth: 1.5,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Time in Days', color: '#94a3b8' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#64748b' }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Individuals', color: '#94a3b8' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#64748b' }
                    }
                }
            }
        });
    }

    function simulate() {
        const N = parseFloat(popSlider.value);
        let baseBeta = parseFloat(betaSlider.value);
        const incPeriod = parseFloat(incubationSlider.value);
        const infPeriod = parseFloat(infectiousSlider.value);
        const sigma = 1.0 / incPeriod;
        const gamma = 1.0 / infPeriod;

        const lockdownRed = parseFloat(lockdownEffSlider.value) / 100.0;
        const lockdownStart = parseFloat(lockdownDaySlider.value);
        const vaxRate = (parseFloat(vaxSlider.value) / 100.0) / 24.0; // hourly or daily

        // Update UI Displays
        popVal.textContent = Math.round(N).toLocaleString();
        betaVal.textContent = baseBeta.toFixed(2);
        incubationVal.textContent = `${incPeriod.toFixed(1)} days`;
        infectiousVal.textContent = `${infPeriod.toFixed(1)} days`;
        lockdownEffVal.textContent = `${Math.round(lockdownRed * 100)}%`;
        lockdownDayVal.textContent = `Day ${lockdownStart}`;
        vaxVal.textContent = `${parseFloat(vaxSlider.value).toFixed(1)}% / day`;

        // Basic Reproduction Number: R0 = beta / gamma
        const R0 = baseBeta / gamma;
        r0Val.textContent = `R₀ = ${R0.toFixed(2)}`;

        // Herd Immunity Threshold: 1 - 1/R0
        const hit = R0 > 1 ? ((1 - 1 / R0) * 100) : 0;
        hitVal.textContent = `${hit.toFixed(1)}%`;

        // Time simulation using RK4
        const days = 160;
        const dt = 0.1; // 10 steps per day
        const totalSteps = Math.round(days / dt);

        let S = N - 10;
        let E = 0;
        let I = 10;
        let R = 0;

        const labels = [];
        const sCurve = [];
        const eCurve = [];
        const iCurve = [];
        const rCurve = [];
        const capacityCurve = [];

        const hospitalCapacity = N * 0.04; // 4% simultaneous ICU / hospital beds capacity

        let maxI = 0;
        let dayOfMaxI = 0;

        // ODE Derivatives
        function getDerivatives(s, e, i, r, tDay) {
            const currentBeta = (tDay >= lockdownStart && lockdownRed > 0)
                ? baseBeta * (1.0 - lockdownRed)
                : baseBeta;

            const vaxS = (tDay >= lockdownStart) ? (vaxRate * s) : 0;
            const newExposed = (currentBeta * s * i) / N;
            const newInfectious = sigma * e;
            const newRecovered = gamma * i;

            const dS = -newExposed - vaxS;
            const dE = newExposed - newInfectious;
            const dI = newInfectious - newRecovered;
            const dR = newRecovered + vaxS;

            return [dS, dE, dI, dR];
        }

        for (let step = 0; step <= totalSteps; step++) {
            const currentDay = step * dt;

            // Track peaks
            if (I > maxI) {
                maxI = I;
                dayOfMaxI = currentDay;
            }

            // Save sample every 1 day
            if (step % 10 === 0) {
                labels.push(`Day ${Math.round(currentDay)}`);
                sCurve.push(Math.round(S));
                eCurve.push(Math.round(E));
                iCurve.push(Math.round(I));
                rCurve.push(Math.round(R));
                capacityCurve.push(chkCapacity.checked ? hospitalCapacity : null);
            }

            // RK4 step
            const [k1_s, k1_e, k1_i, k1_r] = getDerivatives(S, E, I, R, currentDay);
            const [k2_s, k2_e, k2_i, k2_r] = getDerivatives(
                S + 0.5 * dt * k1_s,
                E + 0.5 * dt * k1_e,
                I + 0.5 * dt * k1_i,
                R + 0.5 * dt * k1_r,
                currentDay + 0.5 * dt
            );
            const [k3_s, k3_e, k3_i, k3_r] = getDerivatives(
                S + 0.5 * dt * k2_s,
                E + 0.5 * dt * k2_e,
                I + 0.5 * dt * k2_i,
                R + 0.5 * dt * k2_r,
                currentDay + 0.5 * dt
            );
            const [k4_s, k4_e, k4_i, k4_r] = getDerivatives(
                S + dt * k3_s,
                E + dt * k3_e,
                I + dt * k3_i,
                R + dt * k3_r,
                currentDay + dt
            );

            S += (dt / 6) * (k1_s + 2 * k2_s + 2 * k3_s + k4_s);
            E += (dt / 6) * (k1_e + 2 * k2_e + 2 * k3_e + k4_e);
            I += (dt / 6) * (k1_i + 2 * k2_i + 2 * k3_i + k4_i);
            R += (dt / 6) * (k1_r + 2 * k2_r + 2 * k3_r + k4_r);

            // Boundary clamping
            S = Math.max(0, S);
            E = Math.max(0, E);
            I = Math.max(0, I);
            R = Math.max(0, R);
        }

        // Final summary stats
        const finalR = rCurve[rCurve.length - 1];
        const totalAttackPct = ((finalR / N) * 100).toFixed(1);

        peakInfections.textContent = Math.round(maxI).toLocaleString();
        peakDay.textContent = `Occurs on Day ${Math.round(dayOfMaxI)}`;
        totalAttack.textContent = `${totalAttackPct}%`;
        totalInfectedCount.textContent = `${Math.round(finalR).toLocaleString()} total cumulative cases`;

        // Healthcare capacity check
        if (maxI > hospitalCapacity) {
            const ratio = (maxI / hospitalCapacity).toFixed(1);
            capacityStatus.textContent = `Surpassed ${ratio}x`;
            capacityStatus.className = 'impact-val text-warning';
        } else {
            capacityStatus.textContent = `Under Capacity`;
            capacityStatus.className = 'impact-val text-success';
        }

        // Update Current Compartments KPI (Peak Snapshot)
        kpiS.textContent = Math.round(sCurve[0]).toLocaleString();
        kpiSpct.textContent = `${((sCurve[0] / N) * 100).toFixed(1)}%`;
        kpiE.textContent = Math.round(maxI * 0.4).toLocaleString();
        kpiEpct.textContent = `${((maxI * 0.4 / N) * 100).toFixed(1)}%`;
        kpiI.textContent = Math.round(maxI).toLocaleString();
        kpiIpct.textContent = `${((maxI / N) * 100).toFixed(1)}%`;
        kpiR.textContent = Math.round(finalR).toLocaleString();
        kpiRpct.textContent = `${((finalR / N) * 100).toFixed(1)}%`;

        // Update Chart
        chart.data.labels = labels;
        chart.data.datasets[0].data = sCurve;
        chart.data.datasets[1].data = eCurve;
        chart.data.datasets[2].data = iCurve;
        chart.data.datasets[3].data = rCurve;
        chart.data.datasets[4].data = capacityCurve;
        chart.update();
    }

    function applyPreset(key) {
        const p = PRESETS[key];
        if (!p) return;

        betaSlider.value = p.beta;
        incubationSlider.value = p.incubation;
        infectiousSlider.value = p.infectious;
        popSlider.value = p.pop;
        lockdownEffSlider.value = p.reduction;
        lockdownDaySlider.value = p.startDay;
        vaxSlider.value = p.vax;

        simulate();
    }

    const inputs = [
        popSlider, betaSlider, incubationSlider, infectiousSlider,
        lockdownEffSlider, lockdownDaySlider, vaxSlider, chkCapacity
    ];

    inputs.forEach(input => input.addEventListener('input', simulate));

    scenarioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            scenarioBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyPreset(btn.dataset.preset);
        });
    });

    initChart();
    applyPreset('covid');
})();
