const SHEETS = {
  main: {
    id: "1Bg59xJ73C74jtIfcZ6aIfljzOptn9pEfiS8PHzfyYu8",
    name: "mp bank transactions data for finances dashboard",
    tabs: {
      transactions: { name: "BSA_Transactions", gid: "907895022", range: "A1:G32000" },
      balances: { name: "BSA_Balances", gid: "1473575140", range: "A1:I3200" },
      netWorth: { name: "All_In_One_New", gid: "1718468352", range: "A1:N1100" },
      coletteIncome: { name: "Colette_Income", gid: "1727089453", range: "A1:B1000" },
      coletteExpenses: { name: "Collette_Monthly_Expenses", gid: "9301581", range: "A1:F1000" },
      coletteBalances: { name: "COLETTE", gid: "1832660909", range: "A1:F1000" },
      stocks: { name: "Stock Overview", gid: "91802090", range: "A1:M40" },
      stockHistory: { name: "Fidelity_Stocks", gid: "1160429676", range: "A1:Z200" },
      goals: { name: "Goals", gid: "26812576", range: "A1:L200" },
      budget: { name: "Budget_Picture", gid: "948272983", range: "A1:M80" },
    },
  },
};

const FALLBACK = {
  transactions: [
    { Date: "2026-01-03", Amount: 3200, Business: "Payroll Deposit", Category: "Income", Account: "Checking" },
    { Date: "2026-01-05", Amount: -1450, Business: "Rent Payment", Category: "Housing", Account: "Checking" },
    { Date: "2026-01-08", Amount: -185.42, Business: "Grocery Store", Category: "Groceries", Account: "Credit Card" },
    { Date: "2026-01-12", Amount: -92.18, Business: "Utility Provider", Category: "Utilities", Account: "Checking" },
    { Date: "2026-02-03", Amount: 3200, Business: "Payroll Deposit", Category: "Income", Account: "Checking" },
    { Date: "2026-02-09", Amount: -74.5, Business: "Fuel Station", Category: "Transportation", Account: "Credit Card" },
  ],
  balances: [
    { Date: "2026-02-28", Balance: 8400, AccountName: "Savings", AccountType: "depository" },
    { Date: "2026-02-28", Balance: 2450, AccountName: "Checking", AccountType: "depository" },
    { Date: "2026-02-28", Balance: -620, AccountName: "Credit Card", AccountType: "credit" },
  ],
  stocks: [
    { Name: "US Index Fund", Ticker: "USIDX", Invested: 25000, Value: 27600, Return: 2600, ReturnPct: 0.104, Allocation: 0.62 },
    { Name: "International Fund", Ticker: "INTL", Invested: 12000, Value: 12840, Return: 840, ReturnPct: 0.07, Allocation: 0.29 },
    { Name: "Bond Fund", Ticker: "BOND", Invested: 4000, Value: 4080, Return: 80, ReturnPct: 0.02, Allocation: 0.09 },
  ],
  stockHistory: [
    { month: "2025-09", invested: 10000, value: 10320 },
    { month: "2026-01", invested: 26000, value: 27450 },
    { month: "2026-03", invested: 37000, value: 39200 },
    { month: "2026-06", invested: 41000, value: 44520 },
  ],
  goals: [
    { category: "Savings", name: "Emergency Fund", amount: 15000, current: 8400, pct: 0.56 },
    { category: "Debt", name: "Pay Down Debt", amount: 5000, current: 1800, pct: 0.36 },
    { category: "Net Worth", name: "Net Worth Target", amount: 100000, current: 44520, pct: 0.4452 },
  ],
};

const state = {
  sourceMode: "Loading",
  transactions: [],
  balances: [],
  stocks: [],
  stockHistory: [],
  goals: [],
  filters: { month: "all", account: "all", owner: "all" },
};

const views = {
  overview: { title: "Overview", node: "overviewView" },
  cashflow: { title: "Cash Flow", node: "cashflowView" },
  portfolio: { title: "Portfolio", node: "portfolioView" },
  goals: { title: "Goals", node: "goalsView" },
  settings: { title: "Sources", node: "settingsView" },
};

const colors = ["#27785d", "#326fa8", "#b17c2b", "#6d5b9d", "#b94b45", "#70806f", "#3f8589"];
const OVERLAP_CATEGORIES = new Set(["Debt Payments", "Transfers In", "Transfers Out"]);
const EARNED_INCOME_PATTERNS = ["payroll", "direct dep", "gusto", "galen", "sero mental", "digital strike", "kroger", "colette income"];

document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();
  bindFilters();
  document.getElementById("refreshButton").addEventListener("click", loadData);
  loadData();
});

async function loadData() {
  setConnection("Refreshing");
  showStatus("");

  try {
    const [transactions, balances, coletteIncome, coletteExpenses, stocks, stockHistory, goals] = await Promise.all([
      fetchSheetRows(SHEETS.main.id, SHEETS.main.tabs.transactions),
      fetchSheetRows(SHEETS.main.id, SHEETS.main.tabs.balances),
      fetchSheetRows(SHEETS.main.id, SHEETS.main.tabs.coletteIncome),
      fetchSheetRows(SHEETS.main.id, SHEETS.main.tabs.coletteExpenses),
      fetchSheetRows(SHEETS.main.id, SHEETS.main.tabs.stocks),
      fetchSheetRows(SHEETS.main.id, SHEETS.main.tabs.stockHistory),
      fetchSheetRows(SHEETS.main.id, SHEETS.main.tabs.goals),
    ]);

    const mpTransactions = normalizeTransactions(transactions, "MP");
    state.transactions = mpTransactions;
    state.transactions = [
      ...mpTransactions,
      ...normalizeColetteIncome(coletteIncome),
      ...normalizeColetteExpenses(coletteExpenses),
    ].sort((a, b) => b.Date - a.Date);
    state.balances = normalizeBalances(balances);
    state.stocks = normalizeStocks(stocks);
    state.stockHistory = normalizeStockHistory(stockHistory);
    state.goals = normalizeGoals(goals);
    state.sourceMode = "Live";
  } catch (error) {
    state.transactions = normalizeTransactions(FALLBACK.transactions);
    state.balances = normalizeBalances(FALLBACK.balances);
    state.stocks = FALLBACK.stocks;
    state.stockHistory = FALLBACK.stockHistory;
    state.goals = FALLBACK.goals;
    state.sourceMode = "Sample";
    showStatus("Live Google Sheet data was unavailable in this browser session, so sample rows from your sheets are displayed.");
    console.warn(error);
  }

  defaultToLatestMonth();
  updateFilters();
  render();
  setConnection(state.sourceMode);
  document.getElementById("lastRefresh").textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fetchSheetRows(spreadsheetId, tab) {
  const query = encodeURIComponent("select *");
  const range = encodeURIComponent(tab.range);
  const cacheKey = Date.now();
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?gid=${tab.gid}&range=${range}&tq=${query}&cacheBust=${cacheKey}`;

  return new Promise((resolve, reject) => {
    const callback = `sheetCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out loading ${tab.name}`));
    }, 12000);

    window[callback] = (payload) => {
      cleanup();
      if (!payload?.table?.cols || !payload?.table?.rows) {
        reject(new Error(`No table returned for ${tab.name}`));
        return;
      }
      resolve(gvizToRows(payload.table));
    };

    function cleanup() {
      window.clearTimeout(timer);
      delete window[callback];
      script.remove();
    }

    script.onerror = () => {
      cleanup();
      reject(new Error(`Could not load ${tab.name}`));
    };
    script.src = `${url}&tqx=responseHandler:${callback}`;
    document.head.appendChild(script);
  });
}

function gvizToRows(table) {
  const headers = table.cols.map((col, index) => cleanHeader(col.label || col.id || `Column ${index + 1}`));
  return table.rows
    .map((row) => {
      const entry = {};
      headers.forEach((header, index) => {
        const cell = row.c[index];
        entry[header] = cell ? cell.f ?? cell.v ?? "" : "";
      });
      return entry;
    })
    .filter((row) => Object.values(row).some((value) => String(value).trim() !== ""));
}

function normalizeTransactions(rows, owner = "MP") {
  return rows
    .map((row) => ({
      Date: parseDate(row.Date),
      Amount: money(row.Amount),
      Business: row.Business || "Unknown",
      Category: row.Category || "UNCATEGORIZED",
      Account: row.Account || "Unknown",
      Owner: row.Owner || owner,
      Status: row.Status || "",
    }))
    .filter((row) => row.Date && Number.isFinite(row.Amount))
    .sort((a, b) => b.Date - a.Date);
}

function normalizeColetteIncome(rows) {
  return rows
    .map((row) => ({
      Date: parseDate(row.Month),
      Amount: money(row["Total Income"]),
      Business: "Colette income",
      Category: "Income",
      Account: "Colette monthly summary",
      Owner: "CW",
      Status: "monthly-summary",
    }))
    .filter((row) => row.Date && Number.isFinite(row.Amount) && row.Amount !== 0);
}

function normalizeColetteExpenses(rows) {
  const summaryMonth = latestMonthFromRows(state.transactions) || new Date();
  return rows
    .filter((row) => row.Amount && !String(row["Column 1"] || "").toLowerCase().includes("total"))
    .map((row) => ({
      Date: summaryMonth,
      Amount: -Math.abs(money(row.Amount)),
      Business: row["Column 1"] || row.Category || "Colette monthly expense",
      Category: mapExpenseCategory(row["Column 1"] || row.Category || "Expense"),
      Account: row.Card || "Colette monthly summary",
      Owner: "CW",
      Status: row["Auto / Manual"] || "monthly-summary",
    }))
    .filter((row) => row.Date && Number.isFinite(row.Amount) && row.Amount !== 0);
}

function normalizeBalances(rows) {
  return rows
    .map((row) => ({
      Date: parseDate(row.Date),
      Balance: money(row.Balance),
      Available: money(row.BalanceAvailable),
      AccountName: row.AccountName || row.Account || "Unknown",
      AccountType: row.AccountType || row.Type || "account",
    }))
    .filter((row) => row.Date && Number.isFinite(row.Balance))
    .sort((a, b) => b.Date - a.Date);
}

function normalizeStocks(rows) {
  return rows
    .filter((row) => row.Type && row.Type !== "Total" && row.Ticker)
    .map((row) => ({
      Name: row.Name || row.Ticker,
      Ticker: row.Ticker,
      Invested: money(row["TOTAL Invested RUNNING TOTAL ALL TIME"]),
      Value: money(row["CURRENT RUNNING TOTAL ALL VALUE"]),
      Return: money(row["RUNNING TOTAL ALL RETURN AMOUNT"]),
      ReturnPct: percent(row["RUNNING TOTAL ALL RETURN %"]),
      Allocation: percent(row["% of portfolio"]),
      Description: row.Description || "",
    }))
    .filter((row) => Number.isFinite(row.Value));
}

function normalizeStockHistory(rows) {
  return rows
    .map((row) => {
      const keys = Object.keys(row);
      const month = parseMonth(row["Year Month"]);
      const invested = keys
        .filter((key) => key.includes("Invested Running Total"))
        .reduce((sum, key) => sum + Math.max(0, money(row[key]) || 0), 0);
      const value = keys
        .filter((key) => key.includes("Running Total Value"))
        .reduce((sum, key) => sum + Math.max(0, money(row[key]) || 0), 0);
      return { month, invested, value };
    })
    .filter((row) => row.month && (row.invested || row.value));
}

function normalizeGoals(rows) {
  return rows
    .map((row) => {
      const amount = money(row.Amount || row["Start Debt"]);
      const current = money(row.Current);
      const pct = percent(row["% There goal"]) || percent(row["% There"]) || (amount ? current / amount : 0);
      return {
        category: row["Category Goal"] || "Goal",
        name: row["Goal Name"] || "",
        amount,
        current,
        pct,
        deadline: row["By When / Deadline"] || "",
      };
    })
    .filter((row) => row.name && Number.isFinite(row.pct));
}

function render() {
  const tx = filteredTransactions();
  const operatingTx = tx.filter(isOperatingTransaction);
  const totals = operatingTx.reduce(
    (acc, row) => {
      if (row.Amount >= 0 && isEarnedIncome(row)) acc.income += row.Amount;
      if (row.Amount < 0) acc.spend += Math.abs(row.Amount);
      return acc;
    },
    { income: 0, spend: 0 },
  );
  const net = totals.income - totals.spend;

  text("incomeMetric", currency(totals.income));
  text("spendMetric", currency(totals.spend));
  text("cashflowMetric", currency(net));
  document.getElementById("cashflowMetric").className = net >= 0 ? "positive" : "negative";
  text("portfolioMetric", currency(sum(state.stocks, "Value")));
  const excludedCount = tx.length - operatingTx.length;
  const passiveIncomeCount = operatingTx.filter((row) => row.Amount > 0 && !isEarnedIncome(row)).length;
  text("transactionCount", `${tx.length} rows / ${excludedCount} overlap removed / ${passiveIncomeCount} passive income rows not in income card`);

  renderCashflowCharts(tx);
  renderCategories(tx);
  renderBalances();
  renderTransactions(tx);
  renderPortfolio();
  renderGoals();
  renderSources();
}

function filteredTransactions() {
  return state.transactions.filter((row) => {
    const monthKey = toMonthKey(row.Date);
    const monthMatch = state.filters.month === "all" || monthKey === state.filters.month;
    const accountMatch = state.filters.account === "all" || row.Account === state.filters.account;
    const ownerMatch = state.filters.owner === "all" || row.Owner === state.filters.owner;
    return monthMatch && accountMatch && ownerMatch;
  });
}

function renderCashflowCharts(transactions) {
  const monthly = groupMonthly(state.transactions.filter((row) => state.filters.owner === "all" || row.Owner === state.filters.owner).filter(isOperatingTransaction));
  const labels = monthly.map((row) => row.month);
  drawLineBars("cashflowChart", labels, monthly.map((row) => row.net), { label: "Net", color: "#27785d" });
  drawGroupedBars("incomeSpendChart", labels, monthly.map((row) => row.income), monthly.map((row) => row.spend));
  text("cashflowRange", labels.length ? `${labels[0]} to ${labels[labels.length - 1]}` : "No data");
}

function renderCategories(transactions) {
  const spendByCategory = Object.entries(
    transactions
      .filter(isOperatingTransaction)
      .filter((row) => row.Amount < 0)
      .reduce((acc, row) => {
        acc[row.Category] = (acc[row.Category] || 0) + Math.abs(row.Amount);
        return acc;
      }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const totalSpend = spendByCategory.reduce((total, [, value]) => total + value, 0);
  text("categoryCount", `${spendByCategory.length} categories`);
  text("categoryDetailCount", `${spendByCategory.length} categories`);

  document.getElementById("categoryList").innerHTML = spendByCategory
    .slice(0, 7)
    .map(([category, amount], index) => rankRow(category, currency(amount), totalSpend ? amount / totalSpend : 0, colors[index % colors.length]))
    .join("");

  document.getElementById("categoryDetail").innerHTML = spendByCategory
    .map(([category, amount]) => `<article class="detail-card"><span>${escapeHtml(category)}</span><strong>${currency(amount)}</strong></article>`)
    .join("");

  drawDonut("categoryDonut", spendByCategory.slice(0, 7).map(([label, value]) => ({ label, value })));
}

function renderBalances() {
  const latestDate = state.balances[0]?.Date;
  const latest = state.balances.filter((row) => row.Date?.getTime() === latestDate?.getTime());
  text("balanceDate", latestDate ? formatDate(latestDate) : "No data");
  document.getElementById("balanceList").innerHTML = latest
    .slice(0, 8)
    .map(
      (row) => `<div class="balance-row">
        <div><strong>${escapeHtml(row.AccountName)}</strong><br><span>${escapeHtml(row.AccountType)}</span></div>
        <strong class="${row.Balance >= 0 ? "positive" : "negative"}">${currency(row.Balance)}</strong>
      </div>`,
    )
    .join("");
}

function renderTransactions(transactions) {
  document.getElementById("transactionsTable").innerHTML = transactions
    .slice(0, 18)
    .map(
      (row) => `<tr>
        <td>${formatDate(row.Date)}</td>
        <td>${escapeHtml(row.Business)}</td>
        <td>${escapeHtml(row.Category)}</td>
        <td>${escapeHtml(ownerLabel(row.Owner))}</td>
        <td>${escapeHtml(row.Account)}</td>
        <td class="right ${row.Amount >= 0 ? "positive" : "negative"}">${currency(row.Amount)}</td>
      </tr>`,
    )
    .join("");
}

function renderPortfolio() {
  const total = sum(state.stocks, "Value");
  text("portfolioCount", `${state.stocks.length} holdings`);
  document.getElementById("portfolioBars").innerHTML = state.stocks
    .sort((a, b) => b.Value - a.Value)
    .map(
      (row, index) => `<div class="portfolio-row">
        <div class="portfolio-top">
          <div><strong>${escapeHtml(row.Ticker)}</strong><br><span>${escapeHtml(row.Name)}</span></div>
          <strong>${currency(row.Value)}</strong>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, (row.Value / total) * 100)}%;background:${colors[index % colors.length]}"></div></div>
      </div>`,
    )
    .join("");

  document.getElementById("returnSnapshot").innerHTML = state.stocks
    .sort((a, b) => b.ReturnPct - a.ReturnPct)
    .slice(0, 8)
    .map((row, index) => rankRow(row.Ticker, `${currency(row.Return)} (${formatPercent(row.ReturnPct)})`, Math.max(0, row.ReturnPct), colors[index % colors.length]))
    .join("");

  drawLineBars(
    "investmentChart",
    state.stockHistory.map((row) => row.month),
    state.stockHistory.map((row) => row.value),
    { label: "Value", color: "#326fa8" },
  );
}

function renderGoals() {
  text("goalCount", `${state.goals.length} goals`);
  document.getElementById("goalsList").innerHTML = state.goals
    .sort((a, b) => b.pct - a.pct)
    .map(
      (goal, index) => `<div class="goal-row">
        <div class="goal-top">
          <div><strong>${escapeHtml(goal.name)}</strong><br><span>${escapeHtml(goal.category)}</span></div>
          <strong>${formatPercent(goal.pct)}</strong>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, goal.pct * 100)}%;background:${colors[index % colors.length]}"></div></div>
        <span>${currency(goal.current)} of ${currency(goal.amount)} ${goal.deadline ? `by ${escapeHtml(goal.deadline)}` : ""}</span>
      </div>`,
    )
    .join("");
}

function renderSources() {
  const tabs = [
    ["MP Transactions", SHEETS.main.name, SHEETS.main.tabs.transactions],
    ["Balances", SHEETS.main.name, SHEETS.main.tabs.balances],
    ["Colette Income", SHEETS.main.name, SHEETS.main.tabs.coletteIncome],
    ["Colette Expenses", SHEETS.main.name, SHEETS.main.tabs.coletteExpenses],
    ["Stocks", SHEETS.main.name, SHEETS.main.tabs.stocks],
    ["Stock History", SHEETS.main.name, SHEETS.main.tabs.stockHistory],
    ["Goals", SHEETS.main.name, SHEETS.main.tabs.goals],
  ];
  text("sourceCount", `${tabs.length} tabs`);
  document.getElementById("sourcesList").innerHTML = tabs
    .map(
      ([label, book, tab]) => `<div class="source-card">
        <div><strong>${label}</strong><br><span>${escapeHtml(book)} / ${escapeHtml(tab.name)}</span></div>
        <span>gid ${tab.gid}</span>
      </div>`,
    )
    .join("");
}

function updateFilters() {
  const monthSelect = document.getElementById("monthFilter");
  const accountSelect = document.getElementById("accountFilter");
  const ownerSelect = document.getElementById("ownerFilter");
  const months = [...new Set(state.transactions.map((row) => toMonthKey(row.Date)).filter(Boolean))].sort().reverse();
  const accounts = [...new Set(state.transactions.map((row) => row.Account).filter(Boolean))].sort();

  fillSelect(monthSelect, [["all", "All months"], ...months.map((month) => [month, month])], state.filters.month);
  fillSelect(accountSelect, [["all", "All accounts"], ...accounts.map((account) => [account, account])], state.filters.account);
  ownerSelect.value = state.filters.owner;
}

function fillSelect(select, options, selected) {
  const values = options.map(([value]) => value);
  const valueToUse = values.includes(selected) ? selected : "all";
  select.innerHTML = options.map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("");
  select.value = valueToUse;
}

function bindNavigation() {
  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      document.querySelectorAll(".nav-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
      document.querySelectorAll(".view").forEach((node) => node.classList.remove("active"));
      document.getElementById(views[view].node).classList.add("active");
      text("viewTitle", views[view].title);
      render();
    });
  });
}

function bindFilters() {
  document.getElementById("monthFilter").addEventListener("change", (event) => {
    state.filters.month = event.target.value;
    render();
  });
  document.getElementById("accountFilter").addEventListener("change", (event) => {
    state.filters.account = event.target.value;
    render();
  });
  document.getElementById("ownerFilter").addEventListener("change", (event) => {
    state.filters.owner = event.target.value;
    render();
  });
}

function groupMonthly(transactions) {
  const grouped = transactions.reduce((acc, row) => {
    const key = toMonthKey(row.Date);
    if (!key) return acc;
    acc[key] ||= { month: key, income: 0, spend: 0, net: 0 };
    if (row.Amount >= 0 && isEarnedIncome(row)) {
      acc[key].income += row.Amount;
      acc[key].net += row.Amount;
    }
    if (row.Amount < 0) {
      acc[key].spend += Math.abs(row.Amount);
      acc[key].net += row.Amount;
    }
    return acc;
  }, {});
  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
}

function isOperatingTransaction(row) {
  return !OVERLAP_CATEGORIES.has(row.Category);
}

function isEarnedIncome(row) {
  if (row.Category !== "Income") return false;
  const business = String(row.Business || "").toLowerCase();
  const account = String(row.Account || "").toLowerCase();
  if (business.includes("dividend") || business.includes("interest") || account.includes("certificate")) return false;
  return EARNED_INCOME_PATTERNS.some((pattern) => business.includes(pattern));
}

function defaultToLatestMonth() {
  if (state.filters.month !== "all") return;
  const months = [...new Set(state.transactions.map((row) => toMonthKey(row.Date)).filter(Boolean))].sort();
  const latest = months[months.length - 1];
  if (latest) state.filters.month = latest;
}

function mapExpenseCategory(label) {
  const value = String(label || "").toLowerCase();
  if (value.includes("electric") || value.includes("internet") || value.includes("water") || value.includes("gas - consumers") || value.includes("phone")) return "Utilities";
  if (value.includes("car") || value.includes("gas - car")) return "Transportation";
  if (value.includes("grocery")) return "Groceries";
  if (value.includes("restaurant")) return "Restaurants";
  if (value.includes("medical")) return "Healthcare";
  if (value.includes("self care")) return "Personal Care";
  return "Household";
}

function latestMonthFromRows(rows) {
  const dates = rows.map((row) => row.Date).filter(Boolean);
  if (!dates.length) return null;
  const latest = new Date(Math.max(...dates.map((date) => date.getTime())));
  return new Date(latest.getFullYear(), latest.getMonth(), 1);
}

function ownerLabel(owner) {
  if (owner === "CW") return "Colette";
  if (owner === "MP") return "MP";
  return "Together";
}

function drawLineBars(canvasId, labels, values, options) {
  const canvas = document.getElementById(canvasId);
  const ctx = setupCanvas(canvas);
  const width = canvas.clientWidth;
  const height = Number(canvas.getAttribute("height"));
  ctx.clearRect(0, 0, width, height);
  drawAxes(ctx, width, height);
  if (!values.length) return;

  const max = Math.max(...values.map(Math.abs), 1);
  const step = (width - 56) / values.length;
  const zeroY = height - 36;
  values.forEach((value, index) => {
    const barHeight = Math.abs(value) / max * (height - 70);
    const x = 38 + index * step;
    const y = value >= 0 ? zeroY - barHeight : zeroY;
    ctx.fillStyle = value >= 0 ? options.color : "#b94b45";
    ctx.fillRect(x, y, Math.max(8, step * 0.55), barHeight);
  });
  drawLabels(ctx, labels, width, height);
}

function drawGroupedBars(canvasId, labels, income, spend) {
  const canvas = document.getElementById(canvasId);
  const ctx = setupCanvas(canvas);
  const width = canvas.clientWidth;
  const height = Number(canvas.getAttribute("height"));
  ctx.clearRect(0, 0, width, height);
  drawAxes(ctx, width, height);
  const max = Math.max(...income, ...spend, 1);
  const step = (width - 56) / Math.max(1, labels.length);
  labels.forEach((label, index) => {
    const x = 38 + index * step;
    const w = Math.max(6, step * 0.25);
    const incomeH = income[index] / max * (height - 70);
    const spendH = spend[index] / max * (height - 70);
    ctx.fillStyle = "#27785d";
    ctx.fillRect(x, height - 36 - incomeH, w, incomeH);
    ctx.fillStyle = "#b94b45";
    ctx.fillRect(x + w + 3, height - 36 - spendH, w, spendH);
  });
  drawLabels(ctx, labels, width, height);
}

function drawDonut(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  const ctx = setupCanvas(canvas);
  const width = canvas.clientWidth;
  const height = Number(canvas.getAttribute("height"));
  ctx.clearRect(0, 0, width, height);
  const total = data.reduce((acc, row) => acc + row.value, 0);
  if (!total) return;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.34;
  let start = -Math.PI / 2;
  data.forEach((row, index) => {
    const angle = (row.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    start += angle;
  });
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.58, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.fillStyle = "#17201b";
  ctx.font = "700 20px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(currency(total), centerX, centerY + 7);
}

function setupCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 600;
  const height = Number(canvas.getAttribute("height"));
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return ctx;
}

function drawAxes(ctx, width, height) {
  ctx.strokeStyle = "#dfe4dc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(32, 14);
  ctx.lineTo(32, height - 36);
  ctx.lineTo(width - 12, height - 36);
  ctx.stroke();
}

function drawLabels(ctx, labels, width, height) {
  ctx.fillStyle = "#69756d";
  ctx.font = "11px Inter, sans-serif";
  ctx.textAlign = "center";
  const step = (width - 56) / Math.max(1, labels.length);
  labels.forEach((label, index) => {
    if (index % Math.ceil(labels.length / 6) === 0) {
      ctx.fillText(label.slice(2), 42 + index * step, height - 14);
    }
  });
}

function rankRow(label, value, pct, color) {
  return `<div class="rank-row">
    <div>
      <strong>${escapeHtml(label)}</strong>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, pct * 100)}%;background:${color}"></div></div>
    </div>
    <strong>${escapeHtml(value)}</strong>
  </div>`;
}

function money(value) {
  if (typeof value === "number") return value;
  const textValue = String(value ?? "").trim();
  if (!textValue || textValue === "$ -") return 0;
  const negative = textValue.includes("(") && textValue.includes(")");
  const cleaned = textValue.replace(/[$,%()\s,]/g, "");
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return NaN;
  return negative ? -parsed : parsed;
}

function percent(value) {
  if (typeof value === "number") return value > 1 ? value / 100 : value;
  const parsed = money(value);
  if (!Number.isFinite(parsed)) return 0;
  return String(value).includes("%") || parsed > 1 ? parsed / 100 : parsed;
}

function parseDate(value) {
  if (value instanceof Date) return value;
  if (!value) return null;
  const textValue = String(value).trim();
  const gvizDate = textValue.match(/^Date\((\d+),(\d+),(\d+)\)$/);
  if (gvizDate) {
    return new Date(Number(gvizDate[1]), Number(gvizDate[2]), Number(gvizDate[3]));
  }
  const date = new Date(textValue);
  if (!Number.isNaN(date.getTime())) return date;
  const parts = textValue.split(/[/-]/).map(Number);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    const year = c < 100 ? 2000 + c : c;
    return a > 12 ? new Date(year, b - 1, a) : new Date(year, a - 1, b);
  }
  return null;
}

function parseMonth(value) {
  const date = parseDate(value);
  return date ? toMonthKey(date) : "";
}

function toMonthKey(date) {
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(date) {
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}

function formatPercent(value) {
  return new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 }).format(value || 0);
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}

function cleanHeader(header) {
  return String(header || "").replace(/\s+/g, " ").trim();
}

function text(id, value) {
  document.getElementById(id).textContent = value;
}

function setConnection(value) {
  document.getElementById("connectionState").textContent = value;
}

function showStatus(message) {
  const banner = document.getElementById("statusBanner");
  banner.hidden = !message;
  banner.textContent = message;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.addEventListener("resize", () => render());
