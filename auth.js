import { auth, googleProvider } from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const status = document.getElementById("auth-status");

function showStatus(message) {
  if (status) status.textContent = message;
}

window.oreaAuth = {
  async register(email, password) {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      showStatus("Account created successfully!");
    } catch (error) {
      showStatus(error.message);
    }
  },

  async login(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showStatus("You're signed in!");
    } catch (error) {
      showStatus(error.message);
    }
  },

  async googleLogin() {
    try {
      await signInWithPopup(auth, googleProvider);
      showStatus("Signed in with Google!");
    } catch (error) {
      showStatus(error.message);
    }
  },

  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      showStatus("Password reset email sent.");
    } catch (error) {
      showStatus(error.message);
    }
  },

  async logout() {
    await signOut(auth);
    showStatus("You've signed out.");
  }
};

function getCredentials() {
  const email = document.getElementById("auth-email")?.value.trim();
  const password = document.getElementById("auth-password")?.value;

  if (!email || !password) {
    showStatus("Enter your email and password first.");
    return null;
  }

  return { email, password };
}  

document.getElementById("register-btn")?.addEventListener("click", async () => {
  const credentials = getCredentials();
  if (credentials) await window.oreaAuth.register(
    credentials.email,
    credentials.password
  );
});

document.getElementById("login-btn")?.addEventListener("click", async () => {
  const credentials = getCredentials();
  if (credentials) await window.oreaAuth.login(
    credentials.email,
    credentials.password
  );
});

document.getElementById("google-btn")?.addEventListener("click", async () => {
  await window.oreaAuth.googleLogin();
});

document.getElementById("reset-password-btn")?.addEventListener("click", async () => {
  const email = document.getElementById("auth-email")?.value.trim();

  if (!email) {
    showStatus("Enter your email address first.");
    return;
  }

  await window.oreaAuth.resetPassword(email);
});

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await window.oreaAuth.logout();
});

onAuthStateChanged(auth, user => {
  window.oreaCurrentUser = user;

  document.dispatchEvent(
    new CustomEvent("orea-auth-changed", {
      detail: { user }
    })
  );

  showStatus(
    user
      ? `Signed in as ${user.email || "Google user"}`
      : "You're not signed in."
  );
});
// OREA AI — Account Menu Controller

const signedOutView = document.getElementById("signed-out-view");
const signedInView = document.getElementById("signed-in-view");
const loginForm = document.getElementById("account-login-form");
const accountDetails = document.getElementById("account-details");

const displayName = document.getElementById("account-display-name");
const emailDisplay = document.getElementById("account-email-display");

const openLoginButton = document.getElementById("open-login-btn");
const viewAccountButton = document.getElementById("view-account-btn");
const accountLogoutButton = document.getElementById("account-logout-btn");

// Open or close the login form
openLoginButton?.addEventListener("click", () => {
    if (!loginForm) return;

    loginForm.hidden = !loginForm.hidden;
    if (accountDetails) accountDetails.hidden = true;
});

// Open or close account details
viewAccountButton?.addEventListener("click", () => {
    if (!accountDetails) return;

    accountDetails.hidden = !accountDetails.hidden;
    if (loginForm) loginForm.hidden = true;
});

// Log out
accountLogoutButton?.addEventListener("click", async () => {
    try {
        await window.oreaAuth.logout();
    } catch (error) {
        console.error("Logout failed:", error);
    }
});

// Update the menu whenever Firebase authentication changes
function updateAccountMenu(user) {
    if (signedOutView) signedOutView.hidden = Boolean(user);
    if (signedInView) signedInView.hidden = !user;

    if (displayName) {
        displayName.textContent = user
            ? (user.displayName || "My Account")
            : "OREA Account";
    }

    if (emailDisplay) {
        emailDisplay.textContent = user
            ? (user.email || "Email unavailable")
            : "";
    }

    if (loginForm) loginForm.hidden = true;
    if (accountDetails) accountDetails.hidden = true;
}

// Listen for authentication changes
document.addEventListener("orea-auth-changed", (event) => {
    updateAccountMenu(event.detail.user);
});

// Initialise the account menu
if (window.oreaCurrentUser !== undefined) {
    updateAccountMenu(window.oreaCurrentUser);
} else {
    if (signedOutView) signedOutView.hidden = false;
    if (signedInView) signedInView.hidden = true;
}
