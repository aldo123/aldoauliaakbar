// Simulasi akun login
const users = [
  { username: "LiaoAlan", password: "12345" },
  { username: "Aldo", password: "admin" },
  { username: "Engineer", password: "tpm2025" },
  { username: "Tomi", password: "tomi1234" }
];

const form = document.getElementById("loginForm");
const message = document.getElementById("loginMessage");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    // Simpan session user dan redirect ke dashboard
    localStorage.setItem("loggedUser", username);
    window.location.href = "dashboard.html";
  } else {
    message.textContent = "Invalid username or password.";
  }
});
