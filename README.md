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

Here is an end-to-end explanation of your Solar Energy Farm — Supply Chain & Logistics Model (HeliosChain) project, how every part of the math and simulation works, and how you can update the data anytime.

1. **Project Purpose (What Problem It Solves)**: Utility-scale solar farm construction (e.g., 150 MWdc, ~258,621 modules across 418 containers) depends on an international supply chain where solar panels move from overseas factories through ocean shipping, port customs clearance, and inland trucking to the project site.
 - If modules arrive too late, solar installation crews and cranes sit idle ($24,500+/day standby penalty).
 - If containers arrive too early under a Direct-to-Site model and the farm's laydown yard is full, containers sit at the port terminal incurring port demurrage & truck detention fees ($360+/container/day).
 - This project simulates the entire supply chain under uncertainty, calculates the optimal buffer Safety Stock, and performs a Cost-Benefit Analysis comparing Direct-to-Site (JIT) vs. Regional Buffer Warehouse vs. Optimized Hybrid Buffer.

2. **End-to-End Model Workflow**
     
 A. **Five-Stage Physical Supply Chain**
 Every shipment wave passes sequentially through 5 stages:
 1. Factory Production & Pre-Ship QC (procurement): Manufacturing, EL flash testing, palletizing, and container loading.
 2. Ocean Freight & Vessel Transit (ocean): Sea transit with weather and blank-sailing variability.
 3. Port Clearance & Customs Hold (port): Terminal dwell, customs documentation/UFLPA inspections, and chassis matching.
 4. Inland Drayage & Linehaul (drayage): Rail intermodal / flatbed trucking to the regional hub or farm.
 5. Site Receiving & Array Staging (staging): Offloading and distribution to tracker rows.

 Each stage has 5 parameters: Mean Lead Time (), Standard Deviation (), Bottleneck Probability (), Bottleneck Delay Impact (days), and Unit Cost ($/module).

 B. **Buffer-Stock Optimization (Operations Research Model)**
 - Using your target Cycle Service Level (CSL) (e.g., 97.5%,), the model calculates:
 - **Effective Lead Time ():** Sum of each stage's mean lead time plus expected bottleneck delay ().
 - **Combined Lead-Time Variance ():** Combines continuous transit variance () and discrete bottleneck variance ().
 - **Optimal Safety Stock ():** Accounting simultaneously for daily installation variability () and end-to-end supply lead-time variability ().
 - Reorder Point () and Recommended Warehouse Footprint (modules and 40ft containers).

 C. **Monte Carlo Stochastic Simulation (40–400 Trials)**
 - Runs hundreds of simulated timelines using a seeded random generator (Common Random Numbers) so all three strategies are tested against the **exact same random vessel delays, customs holds,  and daily installation weather swings**.
 - Tracks daily inventory, pipeline WIP, P10 / P50 / P90 confidence bands, stockout days, port demurrage container-days, and aggregates results into **real calendar months (e.g., July 2026,August 2026, September 2026, October 2026, November 2026, December 2026, January 2027)**.

D. **Three Delivery Strategies Compared**
1. **Direct-to-Site (JIT):** Zero warehouse lease or double-handling, but constrained by siteLaydownCapModules. Excess containers wait at the port and incur demurrage; upstream delays   immediately cause crew stockouts.
2. **Regional Buffer Warehouse:** Containers clear port immediately into a leased regional hub, eliminating overflow port demurrage and feeding the farm daily to maintain installation continuity.
3. **Optimized Hybrid Buffer:** Holds only the calculated Safety Stock () in a smaller regional cross-dock while routing steady-state containers directly to site—often delivering the lowest total logistics cost.

3. **Dashboard Views (Tab-by-Tab)**
   
1. **Supply Chain Overview:**
   - **4 Executive KPIs:** Optimal Safety Stock, Installation Continuity %, Recommended Strategy Cost Advantage, and Effective Lead Time.
   - **Interactive Supply Chain Topology:** Click any stage node to inspect variance share and edit lead times/risks inline.
   - **Month-Wise Performance & Previous-Month Comparison:** Colorful horizontal bar chart grouped by calendar month (July 2026, August 2026, etc.) with a Compare vs. Previous Month toggle, MoM scorecard deltas, and a monthly ledger table.
   - **Daily Inventory Trajectory:** Interactive SVG chart with P10–P90 bands, Safety Stock line, Site Laydown Cap line, and calendar-date hover scrubber.
   - **Stage Variance & Strategy Snapshot:** Horizontal colored variance bars showing which stage causes the most supply chain risk. 
2. **Buffer & Monte Carlo:**
   - Interactive sliders for Service Level %, Daily Install Burn Rate, Install Variability, Site Laydown Cap, Installation Start Date, and Monte Carlo Iterations.
   - Calculated Buffer Policy breakdown and a Sampled Bottleneck Disruptions Log.
3. **Warehouse vs. Direct:**
   - Side-by-side **Cost-Benefit Ledger** (Freight, Warehouse Lease, Double-Handling, Working Capital, Port Demurrage, Idle Crew Standby, and Logistics Cost per Watt-Peak $/Wp).
   - **Stacked Cost Breakdown** horizontal chart and **Lead-Time Volatility Break-Even Curve** (to volatility). 
4. **Excel Data & Scenarios:**
   - Drag-and-drop .xlsx / .csv import, .xlsx export, 4 built-in scenario presets, and full spreadsheet-style tables for project specs, stages, and shipment release batches.
5. **Model Guide:**
   - Complete reference of the mathematical equations and Print/PDF or Excel export buttons.

4. **How You Can Change the Data**
   You have three ways to change data—all running 100% locally in your browser with no server required:
   
   **Method 1: Update via Microsoft Excel (.xlsx) — Recommended for Offline Demos**
     1. Click Export Excel (top-right button on any screen, or inside Excel Data & Scenarios). This downloads <project_name>_model.xlsx with 7 worksheets:
      - **Project_Parameters (Editable):** Project name, projectStartDate (YYYY-MM-DD, e.g., 2026-07-01), Farm MWdc, module Wp, modules/container, daily install rate, service level %, site laydown cap, install start day, simulation horizon, Monte Carlo runs.
      - **Supply_Chain_Stages (Editable):** Mean lead days, std dev days, bottleneck probability %, delay days, and unit cost for each of the 5 stages (procurement, ocean, port, drayage, staging).
      - **Cost_Assumptions (Editable):** Warehouse monthly lease, double-handling '$/module', holding %, port free days, 'demurrage $/container/day', 'idle crew $/day', 'direct & warehouse freight $/container'.
      - **Shipment_Schedule (Editable):** Add, delete, or edit Batch_ID, Release_Day, Containers, Modules, and Priority_Mode.
      - **Simulation_Summary, Daily_Simulation_Curve, and Monthly_Comparison (Generated Outputs):** Automatically exported results for sharing or Excel analysis.
     2. Open the .xlsx file in Microsoft Excel on Windows, edit values in the 4 input sheets (keep the sheet names and Key / Stage_ID column identifiers intact), and save.
     3. Click Import Excel in the top bar (or drag-and-drop the file into Excel Data & Scenarios). All KPIs, monthly bars, Monte Carlo trajectories, and cost-benefit tables recalculate    immediately.

   **Method 2: Live Inline Editing in the Dashboard**
   - **Supply Chain Stages:** Click any stage in the pipeline diagram on Supply Chain Overview, or edit all 5 stages together in the table inside Excel Data & Scenarios.
   - **Buffer & Demand Sliders:** Adjust Service Level %, Burn Rate, Variability, and Laydown Cap in Buffer & Monte Carlo.
   - **Cost Rates:** Adjust lease, demurrage, freight, and crew standby costs in Warehouse vs. Direct.
   - **Shipment Waves:** Add/remove batches, edit release days or container counts, or click Auto-Fit Waves to Farm MW inside Excel Data & Scenarios.

   **Method 3: Switch Scenario Presets**
   Use the Active Scenario Preset dropdown in the bottom-left sidebar (or in Excel Data & Scenarios) to switch between:
   - 150 MWdc Utility Farm — Baseline
   - Port Congestion & Customs Crisis
   - 200 MWdc Accelerated EPC Schedule
   - Domestic Mfg — Low-Variance Direct Case
