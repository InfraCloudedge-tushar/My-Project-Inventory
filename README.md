# My Project — Solar Energy Farm Supply Chain & Logistics Model

An interactive, 100% client-side **Solar Module Supply Chain Simulation, Buffer-Stock Optimization, and Warehouse vs. Direct-to-Site Cost-Benefit Dashboard** built for offline local execution on Windows OS with native Microsoft Excel (`.xlsx`) round-trip updates.

---

## Key Capabilities

1. **End-to-End Supply Chain Topology**: Models Factory QC -> Ocean Freight -> Port & Customs Clearance -> Inland Drayage -> Regional Warehouse / Site Staging -> Solar Array Installation.
2. **Stochastic Buffer-Stock Optimizer**: Computes Safety Stock ($SS$), Reorder Point ($ROP$), Days of Supply, and Warehouse Footprint accounting for both installation burn-rate variance ($\sigma_D$) and multi-stage lead-time + bottleneck variance ($\sigma_L$).
3. **Monte Carlo Simulation Engine**: Evaluates 40–400 stochastic trials using Common Random Numbers (CRN) to output P10/P50/P90 inventory trajectories, expected stockout days, installation continuity %, and stage bottleneck attribution.
4. **Warehouse vs. Direct-to-Site Cost-Benefit Analysis**: Compares **Direct-to-Site (JIT)**, **Regional Buffer Warehouse**, and **Optimized Hybrid Buffer** across freight, lease, double-handling, working capital, port demurrage, and idle crew standby penalties—including a Lead-Time Volatility Break-Even Curve.
5. **Offline Excel (`.xlsx`) Round-Trip Integration**: Export the 6-sheet Excel workbook (`Project_Parameters`, `Supply_Chain_Stages`, `Cost_Assumptions`, `Shipment_Schedule`, `Simulation_Summary`, `Daily_Simulation_Curve`), edit any data in Microsoft Excel, and drag-and-drop it back into the dashboard.

---

## Running Locally on Windows OS (No Web Hosting Required)

1. Install **Node.js (LTS v18+)** once from [nodejs.org](https://nodejs.org/).
2. Download & unzip this project folder anywhere on your Windows PC.
3. Double-click **`run_windows.bat`**.
   - On first run, it installs dependencies into `node_modules` (offline thereafter).
   - It automatically launches the dashboard at `http://localhost:3000` in your default browser.
4. Use the **Export Excel** and **Import Excel** buttons in the dashboard to update scenarios via `.xlsx` spreadsheets during live interviews or offline presentations.
