const balanceValue = document.querySelector(".balance-value");
const incomeTotal = document.getElementById("income-total");
const expenseTotal = document.getElementById("expense-total");
const transactionsList = document.getElementById("transactions-list");
const transactionCount = document.getElementById("transaction-count");
const transactionForm = document.getElementById("transaction-form");
const descriptionInput = document.getElementById("transaction-description");
const amountInput = document.getElementById("transaction-amount");
const formFeedback = document.getElementById("form-feedback");

const STORAGE_KEY = "transactions";
const numberFormatter = new Intl.NumberFormat("en-PK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

let transactionRecords = loadTransactions();

transactionForm.addEventListener("submit", addTransaction);
transactionsList.addEventListener("click", handleTransactionAction);
transactionForm.addEventListener("input", clearFormFeedback);

function loadTransactions() {
  try {
    const savedRecords = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    if (!Array.isArray(savedRecords)) return [];

    return savedRecords
      .filter(
        (record) =>
          record &&
          typeof record.description === "string" &&
          Number.isFinite(Number(record.amount)) &&
          Number(record.amount) !== 0,
      )
      .map((record) => ({
        id: String(record.id ?? createTransactionId()),
        description: record.description.trim().slice(0, 80),
        amount: roundToCents(Number(record.amount)),
      }))
      .filter((record) => record.description.length > 0);
  } catch {
    return [];
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactionRecords));
    return true;
  } catch {
    return false;
  }
}

function addTransaction(event) {
  event.preventDefault();

  const description = descriptionInput.value.trim();
  const enteredAmount = Number(amountInput.value);

  if (!description) {
    showFormFeedback("Add a description for this transaction.");
    descriptionInput.focus();
    return;
  }

  if (amountInput.value.trim() === "" || !Number.isFinite(enteredAmount)) {
    showFormFeedback("Enter a valid amount.");
    amountInput.focus();
    return;
  }

  const amount = roundToCents(enteredAmount);

  if (amount === 0) {
    showFormFeedback("The amount must be greater than zero or less than zero.");
    amountInput.focus();
    return;
  }

  transactionRecords.push({
    id: createTransactionId(),
    description,
    amount,
  });

  const savedOnDevice = saveTransactions();
  renderTransactions();
  updateSummary();
  transactionForm.reset();
  clearFormFeedback();

  if (!savedOnDevice) {
    showFormFeedback("Added for now, but this browser could not save it on this device.");
  }
}

function renderTransactions() {
  transactionsList.replaceChildren();
  transactionCount.textContent = `${transactionRecords.length} ${
    transactionRecords.length === 1 ? "entry" : "entries"
  }`;

  if (transactionRecords.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "empty-state";
    emptyState.innerHTML = `
      <span class="empty-state-icon" aria-hidden="true">↗</span>
      <strong>No transactions yet</strong>
      <p>Add your first income or expense to see it here.</p>
    `;
    transactionsList.appendChild(emptyState);
    return;
  }

  [...transactionRecords].reverse().forEach((record) => {
    transactionsList.appendChild(createTransactionRow(record));
  });
}

function createTransactionRow(record) {
  const isExpense = record.amount < 0;
  const transactionRow = document.createElement("li");
  transactionRow.className = `transaction-row${isExpense ? " is-expense" : ""}`;

  const typeIcon = document.createElement("span");
  typeIcon.className = "transaction-type-icon";
  typeIcon.setAttribute("aria-hidden", "true");
  typeIcon.textContent = isExpense ? "−" : "+";

  const transactionCopy = document.createElement("span");
  transactionCopy.className = "transaction-copy";

  const description = document.createElement("span");
  description.className = "transaction-description";
  description.textContent = record.description;

  const transactionKind = document.createElement("span");
  transactionKind.className = "transaction-kind";
  transactionKind.textContent = isExpense ? "Expense" : "Income";
  transactionCopy.append(description, transactionKind);

  const transactionAmount = document.createElement("span");
  transactionAmount.className = "transaction-amount";
  transactionAmount.textContent = `${isExpense ? "−" : "+"} ${formatCurrency(
    Math.abs(record.amount),
  )}`;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.dataset.transactionId = record.id;
  deleteButton.setAttribute("aria-label", `Delete ${record.description}`);
  deleteButton.title = "Delete transaction";
  deleteButton.textContent = "×";

  transactionRow.append(typeIcon, transactionCopy, transactionAmount, deleteButton);
  return transactionRow;
}

function handleTransactionAction(event) {
  const deleteButton = event.target.closest(".delete-button");
  if (!deleteButton) return;

  const transactionId = deleteButton.dataset.transactionId;
  transactionRecords = transactionRecords.filter(
    (record) => record.id !== transactionId,
  );

  saveTransactions();
  renderTransactions();
  updateSummary();
}

function updateSummary() {
  const income = transactionRecords
    .filter((record) => record.amount > 0)
    .reduce((total, record) => total + record.amount, 0);
  const expenses = transactionRecords
    .filter((record) => record.amount < 0)
    .reduce((total, record) => total + Math.abs(record.amount), 0);
  const balance = income - expenses;

  balanceValue.textContent = formatCurrency(balance);
  incomeTotal.textContent = formatCurrency(income);
  expenseTotal.textContent = formatCurrency(expenses);
}

function formatCurrency(amount) {
  const sign = amount < 0 ? "−" : "";
  return `${sign}Rs ${numberFormatter.format(Math.abs(amount))}`;
}

function roundToCents(amount) {
  const roundedMagnitude = Math.round((Math.abs(amount) + Number.EPSILON) * 100) / 100;
  return Math.sign(amount) * roundedMagnitude;
}

function createTransactionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function showFormFeedback(message) {
  formFeedback.textContent = message;
}

function clearFormFeedback() {
  formFeedback.textContent = "";
}

renderTransactions();
updateSummary();
