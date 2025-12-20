// Client-side validation for email, phone, and eircode
document.getElementById("userForm").addEventListener("submit", function (event) {
  event.preventDefault(); // STOP direct submission to server
  validateForm();
});

function clearErrors() {
  // Remove error class from inputs
  const inputs = document.querySelectorAll("input");
  inputs.forEach((input) => input.classList.remove("error"));

  // Clear all error messages (HTML uses <small class="error" ...>)
  const messages = document.querySelectorAll("small.error");
  messages.forEach((msg) => (msg.textContent = ""));
}

function validateForm() {
  clearErrors();

  let isValid = true;

  // Get form elements
  const first = document.getElementById("first_name");
  const second = document.getElementById("second_name");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");
  const eircode = document.getElementById("eircode");

  // Regex patterns (match assignment rules)
  // Names: letters or numbers only, max 20 chars (maxlength already in HTML)
  const namePattern = /^[A-Za-z0-9]+$/;

  // Email: valid email format
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Phone: only numbers, exactly 10 digits
  const phonePattern = /^\d{10}$/;

  // Eircode (assignment): start with a number, alphanumeric, exactly 6 chars
  const eircodePattern = /^[0-9][A-Za-z0-9]{5}$/;

  // First name
  const firstValue = first.value.trim();
  if (!firstValue || firstValue.length > 20 || !namePattern.test(firstValue)) {
    first.classList.add("error");
    document.getElementById("firstNameError").textContent =
      "First name must contain only letters or numbers and be max 20 characters.";
    isValid = false;
  }

  // Second name
  const secondValue = second.value.trim();
  if (!secondValue || secondValue.length > 20 || !namePattern.test(secondValue)) {
    second.classList.add("error");
    document.getElementById("secondNameError").textContent =
      "Second name must contain only letters or numbers and be max 20 characters.";
    isValid = false;
  }

  // Email
  const emailValue = email.value.trim();
  if (!emailPattern.test(emailValue)) {
    email.classList.add("error");
    document.getElementById("emailError").textContent =
      "Please enter a valid email address.";
    isValid = false;
  }

  // Phone
  const phoneValue = phone.value.trim();
  if (!phonePattern.test(phoneValue)) {
    phone.classList.add("error");
    document.getElementById("phoneError").textContent =
      "Phone number must contain only numbers and be exactly 10 digits.";
    isValid = false;
  }

  // Eircode
  const eircodeValue = eircode.value.trim();
  if (!eircodePattern.test(eircodeValue)) {
    eircode.classList.add("error");
    document.getElementById("eircodeError").textContent =
      "Eircode must start with a number, be alphanumeric, and be exactly 6 characters.";
    isValid = false;
  }

  // If everything is valid, submit the form to the server
  if (isValid) {
    document.getElementById("userForm").submit();
  }
}
