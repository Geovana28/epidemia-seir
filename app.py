import math
import numpy as np
from flask import Flask, request, jsonify

app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def home():
    return app.send_static_file('index.html')

@app.route('/api/simulate', methods=['POST'])
def simulate_seir():
    data = request.json or {}
    N = float(data.get('pop', 100000))
    base_beta = float(data.get('beta', 0.50))
    incubation = float(data.get('incubation', 5.0))
    infectious = float(data.get('infectious', 5.0))
    lockdown_red = float(data.get('lockdown_red', 0.0))
    lockdown_day = float(data.get('lockdown_day', 25.0))
    vax_rate = float(data.get('vax_rate', 0.0)) / 100.0 # daily pct

    sigma = 1.0 / incubation
    gamma = 1.0 / infectious
    R0 = base_beta / gamma

    days = 160
    dt = 0.05 # high precision RK4
    total_steps = int(days / dt)

    S = N - 10.0
    E = 0.0
    I = 10.0
    R = 0.0

    def derivatives(s, e, i, r, t):
        beta = base_beta * (1.0 - lockdown_red) if (t >= lockdown_day and lockdown_red > 0) else base_beta
        vax_s = vax_rate * s if (t >= lockdown_day) else 0.0
        new_exp = (beta * s * i) / N
        new_inf = sigma * e
        new_rec = gamma * i
        return -new_exp - vax_s, new_exp - new_inf, new_inf - new_rec, new_rec + vax_s

    labels = []
    s_curve, e_curve, i_curve, r_curve = [], [], [], []
    max_i = 0.0
    day_max_i = 0.0

    for step in range(total_steps + 1):
        t = step * dt
        if I > max_i:
            max_i = I
            day_max_i = t

        if step % 20 == 0: # sample once per day
            labels.append(f"Day {int(round(t))}")
            s_curve.append(int(round(S)))
            e_curve.append(int(round(E)))
            i_curve.append(int(round(I)))
            r_curve.append(int(round(R)))

        # RK4
        k1_s, k1_e, k1_i, k1_r = derivatives(S, E, I, R, t)
        k2_s, k2_e, k2_i, k2_r = derivatives(S + 0.5*dt*k1_s, E + 0.5*dt*k1_e, I + 0.5*dt*k1_i, R + 0.5*dt*k1_r, t + 0.5*dt)
        k3_s, k3_e, k3_i, k3_r = derivatives(S + 0.5*dt*k2_s, E + 0.5*dt*k2_e, I + 0.5*dt*k2_i, R + 0.5*dt*k2_r, t + 0.5*dt)
        k4_s, k4_e, k4_i, k4_r = derivatives(S + dt*k3_s, E + dt*k3_e, I + dt*k3_i, R + dt*k3_r, t + dt)

        S = max(0.0, S + (dt / 6.0) * (k1_s + 2*k2_s + 2*k3_s + k4_s))
        E = max(0.0, E + (dt / 6.0) * (k1_e + 2*k2_e + 2*k3_e + k4_e))
        I = max(0.0, I + (dt / 6.0) * (k1_i + 2*k2_i + 2*k3_i + k4_i))
        R = max(0.0, R + (dt / 6.0) * (k1_r + 2*k2_r + 2*k3_r + k4_r))

    return jsonify({
        "status": "success",
        "r0": round(R0, 2),
        "hit": round((1.0 - 1.0/R0)*100.0, 1) if R0 > 1 else 0.0,
        "peak_i": int(round(max_i)),
        "peak_day": int(round(day_max_i)),
        "total_attack_pct": round((r_curve[-1] / N) * 100.0, 1),
        "labels": labels,
        "s": s_curve,
        "e": e_curve,
        "i": i_curve,
        "r": r_curve
    })

if __name__ == '__main__':
    print("Starting Epidemiological SEIR Python API on http://localhost:5002 ...")
    app.run(host='0.0.0.0', port=5002, debug=False)
