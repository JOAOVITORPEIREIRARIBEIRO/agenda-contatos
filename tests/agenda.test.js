const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { JSDOM } = require("jsdom");

const root = path.join(__dirname, "..");
const html = readFileSync(path.join(root, "index.html"), "utf8");
const script = readFileSync(path.join(root, "script.js"), "utf8");
const storageKey = "agenda_contatos_db";

function createApp(initialContacts = []) {
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "http://agenda.test/",
  });
  const { window } = dom;
  window.localStorage.setItem(storageKey, JSON.stringify(initialContacts));
  window.confirm = () => true;
  window.scrollTo = () => {};
  window.eval(script);
  return dom;
}

function submitContact(window, { name, email, phone = "", notes = "" }) {
  window.document.getElementById("name").value = name;
  window.document.getElementById("email").value = email;
  window.document.getElementById("phone").value = phone;
  window.document.getElementById("notes").value = notes;
  window.document
    .getElementById("contact-form")
    .dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true }),
    );
}

test("executa cadastro, busca, edição e exclusão com persistência", () => {
  const dom = createApp();
  const { window } = dom;
  const document = window.document;

  submitContact(window, {
    name: "Maria Silva",
    email: "maria@example.com",
    phone: "11999999999",
    notes: "Contato de teste",
  });

  let contacts = JSON.parse(window.localStorage.getItem(storageKey));
  assert.equal(contacts.length, 1);
  assert.equal(contacts[0].name, "Maria Silva");
  assert.equal(document.querySelectorAll("#contacts-list tr").length, 1);

  const search = document.getElementById("search-input");
  search.value = "inexistente";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  assert.equal(document.querySelectorAll("#contacts-list tr").length, 0);
  assert.equal(
    document.getElementById("empty-state").classList.contains("hidden"),
    false,
  );

  search.value = "maria";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  document.querySelector(".button-edit").click();
  document.getElementById("name").value = "Maria Souza";
  document
    .getElementById("contact-form")
    .dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true }),
    );

  contacts = JSON.parse(window.localStorage.getItem(storageKey));
  assert.equal(contacts[0].name, "Maria Souza");
  assert.equal(
    document.querySelector("#contacts-list .cell-name").textContent,
    "Maria Souza",
  );

  document.querySelector(".button-delete").click();
  assert.deepEqual(JSON.parse(window.localStorage.getItem(storageKey)), []);
  assert.equal(document.querySelectorAll("#contacts-list tr").length, 0);
  dom.window.close();
});

test("rejeita dados inválidos sem criar contato", () => {
  const dom = createApp();
  const { window } = dom;

  submitContact(window, { name: "", email: "email-invalido" });

  assert.deepEqual(JSON.parse(window.localStorage.getItem(storageKey)), []);
  assert.equal(
    window.document.getElementById("name-error").classList.contains("hidden"),
    false,
  );
  assert.equal(
    window.document.getElementById("email-error").classList.contains("hidden"),
    false,
  );
  dom.window.close();
});

test("renderiza conteúdo e IDs persistidos como dados, nunca como HTML executável", () => {
  const maliciousId = `x');window.__injected=true;//`;
  const dom = createApp([
    {
      id: maliciousId,
      name: "<img src=x onerror=alert(1)>",
      phone: "",
      email: "safe@example.com",
      notes: "<script>window.__injected=true</script>",
    },
  ]);
  const { window } = dom;
  const document = window.document;

  assert.equal(
    document.querySelectorAll("#contacts-list img, #contacts-list script").length,
    0,
  );
  assert.equal(
    document.querySelectorAll("#contacts-list button[onclick]").length,
    0,
  );
  assert.equal(
    document.querySelector(".cell-name").textContent,
    "<img src=x onerror=alert(1)>",
  );

  document.querySelector(".button-edit").click();
  assert.equal(window.__injected, undefined);
  assert.equal(document.getElementById("contact-id").value, maliciousId);
  dom.window.close();
});

test("usa armazenamento isolado por instância de teste e não carrega Tailwind remoto", () => {
  const firstApp = createApp();
  firstApp.window.localStorage.setItem(
    storageKey,
    JSON.stringify([{ id: "1", name: "Somente no primeiro app", email: "a@b.co" }]),
  );

  const secondApp = createApp();
  assert.ok(
    firstApp.window.localStorage
      .getItem(storageKey)
      .includes("Somente no primeiro app"),
  );
  assert.deepEqual(
    JSON.parse(secondApp.window.localStorage.getItem(storageKey)),
    [],
  );
  assert.equal(html.includes("cdn.tailwindcss.com"), false);
  assert.match(html, /href="style\.css"/);

  firstApp.window.close();
  secondApp.window.close();
});
