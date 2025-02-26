document.getElementById('reservaForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevenir el envío tradicional del formulario

    // Obtener y limpiar los valores del formulario
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const fecha = document.getElementById('fecha').value;
    const hora = document.getElementById('hora').value;
    const personas = document.getElementById('personas').value;

    // Validación de campos vacíos
    if (!nombre || !email || !telefono || !fecha || !hora || !personas) {
        mostrarMensaje('Por favor, completa todos los campos.', 'red');
        return;
    }

    // Validación de formato de correo (más robusta)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        mostrarMensaje('Por favor, ingresa un correo electrónico válido (ej. usuario@dominio.com).', 'red');
        return;
    }

    // Validación de número de teléfono (10 dígitos, ajustable según región)
    const telefonoRegex = /^\d{10}$/;
    if (!telefonoRegex.test(telefono)) {
        mostrarMensaje('Por favor, ingresa un número de teléfono válido (10 dígitos, ej. 8091234567).', 'red');
        return;
    }

    // Validación de número de personas (mínimo 1, máximo 20, por ejemplo)
    const numPersonas = parseInt(personas, 10);
    if (isNaN(numPersonas) || numPersonas < 1 || numPersonas > 20) {
        mostrarMensaje('El número de personas debe estar entre 1 y 20.', 'red');
        return;
    }

    // Validación de fecha (solo permitir fecha actual o futuras)
    const today = new Date('2025-02-25'); // Fecha actual: 25 de febrero de 2025
    const selectedDate = new Date(fecha);
    
    if (selectedDate < today) {
        mostrarMensaje('No puedes reservar para un día anterior al actual (25 de febrero de 2025). Solo se permiten reservas para hoy o días futuros.', 'red');
        return;
    }

    // Validación de hora (solo permitir horas futuras si es el día actual)
    if (selectedDate.toDateString() === today.toDateString()) { // Si es el mismo día
        const currentTime = new Date('2025-02-25T19:48:00-08:00'); // Hora actual: 7:48 PM PST (ajusta según zona horaria)
        const [selectedHours, selectedMinutes] = hora.split(':').map(Number);
        const selectedTime = new Date('2025-02-25T' + hora + ':00-08:00'); // Hora seleccionada en formato UTC

        if (selectedTime <= currentTime) {
            mostrarMensaje('No puedes reservar para una hora pasada del día actual (7:48 PM o antes del 25 de febrero de 2025). Elige una hora futura.', 'red');
            return;
        }
    }

    // Confirmación de reserva
    if (!confirm('¿Confirmas tu reserva en El Conuco?')) {
        return;
    }

    // Generar ID único y URLs de cancelación y confirmación
    const idReserva = Date.now().toString(); // Usar toString() para evitar problemas con tipos
    const urlCancelacion = `${location.origin}/views/reservacancelar.html?id=${encodeURIComponent(idReserva)}&email=${encodeURIComponent(email)}`;
    const urlConfirmacion = `${location.origin}/views/reservaconfirmar.html?id=${encodeURIComponent(idReserva)}&email=${encodeURIComponent(email)}`;

    // Construir los mensajes para el usuario y el restaurante
    const mensajeUsuario = `
        Nueva reserva en El Conuco:
        - Nombre: ${nombre}
        - Correo: ${email}
        - Teléfono: ${telefono}
        - Fecha: ${fecha}
        - Hora: ${hora}
        - Personas: ${numPersonas}
        
        Para confirmar tu reserva, haz clic en el siguiente enlace:
        ${urlConfirmacion}
        
        Para cancelar tu reserva, haz clic en el siguiente enlace:
        ${urlCancelacion}
    `.trim();

    const mensajeRestaurante = `
        Nueva reserva recibida en El Conuco:
        - ID de Reserva: ${idReserva}
        - Nombre: ${nombre}
        - Correo: ${email}
        - Teléfono: ${telefono}
        - Fecha: ${fecha}
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
            const restauranteEmail = 'rancelcedeno24@gmail.com'; // Correo real del restaurante
            emailjs.send('service_8je9f18', 'template_z9mjlon', {
                to_email: restauranteEmail,
                from_name: 'Sistema de Reservas El Conuco',
                message: mensajeRestaurante,
                phone: telefono,
                reserva_id: idReserva
            }).then(
                function(responseRestaurante) {
                    console.log('Correo al restaurante enviado con éxito:', responseRestaurante.status, responseRestaurante.text);
                    mostrarMensaje('¡Reserva enviada con éxito! Te contactaremos pronto. Revisa tu correo para confirmar o cancelar, y hemos notificado al restaurante.', 'var(--primary-color)');
                    document.getElementById('reservaForm').reset(); // Limpiar formulario
                    setTimeout(() => {
                        document.getElementById('mensaje').textContent = ''; // Limpiar mensaje después de 5 segundos
                        const modal = bootstrap.Modal.getInstance(document.getElementById('reservaModal'));
                        if (modal) modal.hide(); // Cerrar el modal automáticamente después de 5 segundos
                    }, 5000);
                },
                function(errorRestaurante) {
                    console.error('Error al enviar el correo al restaurante:', errorRestaurante);
                    mostrarMensaje('¡Reserva enviada con éxito al usuario, pero hubo un error al notificar al restaurante. Intenta de nuevo o contacta al soporte.', 'orange');
                }
            );
        },
        function(errorUsuario) {
            console.error('Error al enviar el correo al usuario:', errorUsuario);
            mostrarMensaje('Error al enviar la reserva al usuario. Intenta de nuevo.', 'red');
        }
    );
});

// Función auxiliar para mostrar mensajes de forma consistente
function mostrarMensaje(texto, color) {
    const mensaje = document.getElementById('mensaje');
    mensaje.textContent = texto;
    mensaje.style.color = color;
    mensaje.style.animation = 'bounceIn 1.5s ease-in-out'; // Usar la animación del CSS
}