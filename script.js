document.getElementById("userForm").addEventListener("submit", function (event) {
    event.preventDefault(); // STOP direct submission to server
    validateForm();
});

function clearErrors() {
    const inputs = document.querySelectorAll("input");
    inputs.forEach(input => input.classList.remove("error"));

    const messages = document.querySelectorAll(".error-message");
    messages.forEach(msg => msg.textContent = "");
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

    // Regex patterns
    const namePattern = /^[A-Za-z\s\-]+$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^\+?\d{7,15}$/;
    const eircodePattern = /^[A-Za-z]\d{2}\s?[A-Za-z0-9]{4}$/;

    // First name
    if (!namePattern.test(first.value.trim())) {
        first.classList.add("error");
        first.nextElementSibling.textContent = "First name must contain letters only.";
        isValid = false;
    }

    // Second name
    if (!namePattern.test(second.value.trim())) {
        second.classList.add("error");
        second.nextElementSibling.textContent = "Second name must contain letters only.";
        isValid = false;
    }

    // Email
    if (!emailPattern.test(email.value.trim())) {
        email.classList.add("error");
        email.nextElementSibling.textContent = "Please enter a valid email address.";
        isValid = false;
    }

    // Phone
    if (!phonePattern.test(phone.value.trim())) {
        phone.classList.add("error");
        phone.nextElementSibling.textContent = "Phone number must be digits only (7–15).";
        isValid = false;
    }

    // Eircode
    if (!eircodePattern.test(eircode.value.trim())) {
        eircode.classList.add("error");
        eircode.nextElementSibling.textContent = "Please enter a valid Irish Eircode.";
        isValid = false;
    }

    // If everything is valid, submit the form to the server
    if (isValid) {
        document.getElementById("userForm").submit();
    }
}
