// Configurar restricciones de fecha y hora al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    const fechaInput = document.getElementById('fecha');
    const horaInput = document.getElementById('hora');
    
    // Establecer fecha mínima como hoy
    fechaInput.min = new Date().toISOString().split('T')[0];

    // Ajustar hora mínima si es el día actual
    fechaInput.addEventListener('change', function() {
        const selectedDate = new Date(fechaInput.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate.toDateString() === today.toDateString()) {
            const now = new Date();
            const minTime = now.toTimeString().slice(0, 5); // Ejemplo: "14:30"
            horaInput.min = minTime;
        } else {
            horaInput.min = '00:00'; // Permitir cualquier hora para días futuros
        }
    });
});

document.getElementById('reservaForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const fecha = document.getElementById('fecha').value; // YYYY-MM-DD
    const hora = document.getElementById('hora').value; // HH:mm
    const personas = document.getElementById('personas').value;

    // Validación de campos vacíos
    if (!nombre || !email || !telefono || !fecha || !hora || !personas) {
        mostrarMensaje('Por favor, completa todos los campos.', 'red');
        return;
    }

    // Validación del correo electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        mostrarMensaje('Por favor, ingresa un correo electrónico válido (ej. usuario@dominio.com).', 'red');
        return;
    }

    // Validación del teléfono
    const telefonoRegex = /^\d{10}$/;
    if (!telefonoRegex.test(telefono)) {
        mostrarMensaje('Por favor, ingresa un número de teléfono válido (10 dígitos, ej. 8091234567).', 'red');
        return;
    }

    // Validación del número de personas
    const numPersonas = parseInt(personas, 10);
    if (isNaN(numPersonas) || numPersonas < 1 || numPersonas > 20) {
        mostrarMensaje('El número de personas debe estar entre 1 y 20.', 'red');
        return;
    }

    // Validación de la fecha
    const selectedDate = new Date(fecha);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        mostrarMensaje('No puedes reservar para una fecha pasada. Selecciona hoy o una fecha futura.', 'red');
        return;
    }

    // Validación de la hora si es el día actual
    if (selectedDate.toDateString() === today.toDateString()) {
        const [hours, minutes] = hora.split(':').map(Number);
        const selectedTime = new Date(today);
        selectedTime.setHours(hours, minutes, 0, 0);
        const now = new Date();

        if (selectedTime <= now) {
            mostrarMensaje('No puedes reservar para una hora pasada hoy. Selecciona una hora futura.', 'red');
            return;
        }
    }

    // Confirmación de la reserva
    if (!confirm('¿Confirmas tu reserva en El Conuco?')) {
        return;
    }

    // Formatear fecha para mensajes (DD/MM/YYYY)
    const [year, month, day] = fecha.split('-');
    const fechaFormateada = `${day}/${month}/${year}`;

    // Generar ID de reserva y URLs
    const idReserva = Date.now().toString();
    const urlCancelacion = `${location.origin}/views/reservacancelar.html?id=${encodeURIComponent(idReserva)}&email=${encodeURIComponent(email)}`;
    const urlConfirmacion = `${location.origin}/views/reservaconfirmar.html?id=${encodeURIComponent(idReserva)}&email=${encodeURIComponent(email)}`;

    // Mensaje para el usuario
    const mensajeUsuario = `
        Nueva reserva en El Conuco:
        - Nombre: ${nombre}
        - Correo: ${email}
        - Teléfono: ${telefono}
        - Fecha: ${fechaFormateada}
        - Hora: ${hora}
        - Personas: ${numPersonas}
        
        Para confirmar tu reserva, haz clic en el siguiente enlace:
        ${urlConfirmacion}
        
        Para cancelar tu reserva, haz clic en el siguiente enlace:
        ${urlCancelacion}
    `.trim();

    // Mensaje para el restaurante
    const mensajeRestaurante = `
        Nueva reserva recibida en El Conuco:
        - ID de Reserva: ${idReserva}
        - Nombre: ${nombre}
        - Correo: ${email}
        - Teléfono: ${telefono}
        - Fecha: ${fechaFormateada}
        - Hora: ${hora}
        - Personas: ${numPersonas}

        Para confirmar tu reserva, haz clic en el siguiente enlace:
        ${urlConfirmacion}
        
        Para cancelar tu reserva, haz clic en el siguiente enlace:
        ${urlCancelacion}
    `.trim();

    // Enviar correo al usuario
    emailjs.send('service_8je9f18', 'template_z9mjlon', {
        to_email: email,
        from_name: nombre,
        message: mensajeUsuario,
        phone: telefono,
        reserva_id: idReserva
    }).then(
        function(responseUsuario) {
            console.log('Correo al usuario enviado con éxito:', responseUsuario.status, responseUsuario.text);

            // Enviar correo al restaurante
            const restauranteEmail = 'rancelcedeno24@gmail.com';
            emailjs.send('service_8je9f18', 'template_z9mjlon', {
                to_email: restauranteEmail,
                from_name: 'Sistema de Reservas El Conuco',
                message: mensajeRestaurante,
                phone: telefono,
                reserva_id: idReserva
            }).then(
                function(responseRestaurante) {
                    console.log('Correo al restaurante enviado con éxito:', responseRestaurante.status, responseRestaurante.text);
                    mostrarMensaje('¡Reserva enviada con éxito! Revisa tu correo para confirmar o cancelar.', 'var(--primary-color)');
                    document.getElementById('reservaForm').reset();
                    setTimeout(() => {
                        document.getElementById('mensaje').textContent = '';
                    }, 5000);
                },
                function(errorRestaurante) {
                    console.error('Error al enviar el correo al restaurante:', errorRestaurante);
                    mostrarMensaje('Reserva enviada al usuario, pero hubo un error al notificar al restaurante.', 'orange');
                }
            );
        },
        function(errorUsuario) {
            console.error('Error al enviar el correo al usuario:', errorUsuario);
            mostrarMensaje('Error al enviar la reserva. Intenta de nuevo.', 'red');
        }
    );
});

// Función para mostrar mensajes
function mostrarMensaje(texto, color) {
    const mensaje = document.getElementById('mensaje');
    if (mensaje) {
        mensaje.textContent = texto;
        mensaje.style.color = color;
        mensaje.style.animation = 'hologram 2s infinite';
    } else {
        console.error('Elemento con id "mensaje" no encontrado en el DOM.');
    }
}