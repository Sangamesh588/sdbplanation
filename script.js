async function sendData(event) {
  event.preventDefault();

  const formMessage = document.getElementById("formMessage");

  const data = {
    name: document.getElementById("name").value,
    business_name: document.getElementById("business_name").value,
    phone: document.getElementById("phone").value,
    city: document.getElementById("city").value,
    address: document.getElementById("address").value,
    variety: document.getElementById("variety").value,
    quantity_kg: document.getElementById("quantity_kg").value,
    message: document.getElementById("message").value,
    consent: document.getElementById("consent").checked,
  };

  if (!data.name || !data.phone || !data.address) {
    formMessage.textContent = "⚠️ Please fill Name, Phone, and Address.";
    return;
  }

  if (!data.consent) {
    formMessage.textContent = "⚠️ Please agree to be contacted.";
    return;
  }

  formMessage.textContent = "⏳ Sending...";

  try {
    // ✅ Correct endpoint name here
    const res = await fetch("/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (json.success) {
      formMessage.textContent = "✅ Thank you! Inquiry sent successfully.";
      document.getElementById("contactForm").reset();
    } else {
      formMessage.textContent = "❌ Server error: " + (json.message || "Try again later.");
    }
  } catch (error) {
    console.error(error);
    formMessage.textContent = "❌ Network error. Please check your connection.";
  }
}
