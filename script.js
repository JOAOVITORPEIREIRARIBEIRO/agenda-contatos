// --- ESTADO GLOBAL DA APLICAÇÃO ---
const STORAGE_KEY = "agenda_contatos_db";
let contacts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// --- SELETORES DO DOM ---
const form = document.getElementById("contact-form");
const inputId = document.getElementById("contact-id");
const inputName = document.getElementById("name");
const inputPhone = document.getElementById("phone");
const inputEmail = document.getElementById("email");
const inputNotes = document.getElementById("notes");
const inputSearch = document.getElementById("search-input");

const formTitle = document.getElementById("form-title");
const btnCancel = document.getElementById("btn-cancel");
const contactsList = document.getElementById("contacts-list");
const emptyState = document.getElementById("empty-state");
const alertContainer = document.getElementById("alert-container");

// --- PERSISTÊNCIA & UTILITÁRIOS ---
function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

function showAlert(message, type = "success") {
  alertContainer.textContent = message;
  alertContainer.className = `alert ${
    type === "success" ? "alert-success" : "alert-error"
  }`;
  alertContainer.classList.remove("hidden");
  setTimeout(() => alertContainer.classList.add("hidden"), 4000);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createTextCell(className, value) {
  const cell = document.createElement("td");
  cell.className = className;
  cell.textContent = value;
  return cell;
}

// --- RENDERAÇÃO E FLUXOS CRUD ---

function renderContacts(filter = "") {
  contactsList.replaceChildren();

  const filtered = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(filter.toLowerCase()),
  );

  if (filtered.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  filtered.forEach((contact) => {
    const row = document.createElement("tr");
    row.className = "contact-row";

    row.appendChild(createTextCell("cell-name", contact.name));

    const contactCell = document.createElement("td");
    const phone = document.createElement("div");
    phone.className = "cell-contact";
    phone.textContent = contact.phone || "-";
    const email = document.createElement("div");
    email.className = "cell-email";
    email.textContent = contact.email;
    contactCell.append(phone, email);
    row.appendChild(contactCell);

    const notes = createTextCell("cell-notes", contact.notes || "-");
    notes.title = contact.notes || "";
    row.appendChild(notes);

    const actions = document.createElement("td");
    actions.className = "cell-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "cell-action button-edit";
    editButton.textContent = "Editar";
    editButton.addEventListener("click", () => window.editContact(contact.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "cell-action button-delete";
    deleteButton.textContent = "Excluir";
    deleteButton.addEventListener("click", () =>
      window.deleteContact(contact.id),
    );

    actions.append(editButton, deleteButton);
    row.appendChild(actions);
    contactsList.appendChild(row);
  });
}

// Submeter Formulário (Salvar / Atualizar)
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = inputName.value.trim();
  const email = inputEmail.value.trim();
  const phone = inputPhone.value.trim();
  const notes = inputNotes.value.trim();
  const id = inputId.value;

  let isValid = true;

  if (!name) {
    document.getElementById("name-error").classList.remove("hidden");
    isValid = false;
  } else {
    document.getElementById("name-error").classList.add("hidden");
  }

  if (!email || !validateEmail(email)) {
    document.getElementById("email-error").classList.remove("hidden");
    isValid = false;
  } else {
    document.getElementById("email-error").classList.add("hidden");
  }

  if (!isValid) {
    showAlert(
      "Por favor, preencha os campos obrigatórios corretamente.",
      "error",
    );
    return;
  }

  if (id) {
    const index = contacts.findIndex((contact) => contact.id === id);
    if (index !== -1) {
      contacts[index] = { id, name, phone, email, notes };
      showAlert("Contato atualizado com sucesso!");
    }
  } else {
    contacts.push({
      id: Date.now().toString(),
      name,
      phone,
      email,
      notes,
    });
    showAlert("Contato cadastrado com sucesso!");
  }

  saveToStorage();
  resetForm();
  renderContacts(inputSearch.value);
});

// Carregar dados no formulário para edição
window.editContact = function (id) {
  const contact = contacts.find((item) => item.id === id);
  if (!contact) return;

  inputId.value = contact.id;
  inputName.value = contact.name;
  inputPhone.value = contact.phone;
  inputEmail.value = contact.email;
  inputNotes.value = contact.notes;

  formTitle.textContent = "Editar Contato";
  btnCancel.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// Excluir registro
window.deleteContact = function (id) {
  if (confirm("Tem certeza de que deseja excluir este contato?")) {
    contacts = contacts.filter((contact) => contact.id !== id);
    saveToStorage();
    renderContacts(inputSearch.value);
    showAlert("Contato removido com sucesso!");
  }
};

// Cancelar Edição
btnCancel.addEventListener("click", resetForm);

function resetForm() {
  form.reset();
  inputId.value = "";
  formTitle.textContent = "Novo Contato";
  btnCancel.classList.add("hidden");
  document.getElementById("name-error").classList.add("hidden");
  document.getElementById("email-error").classList.add("hidden");
}

// Filtro de Busca em Tempo Real
inputSearch.addEventListener("input", (event) => {
  renderContacts(event.target.value);
});

// Inicialização da lista ao carregar a página
renderContacts();
