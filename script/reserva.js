document.getElementById('reservaForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const fecha = document.getElementById('fecha').value; // Formato DD/MM/YYYY desde el input
    const hora = document.getElementById('hora').value; // Formato HH:mm (e.g., 05:21 p.m.)
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

    // Convertir la fecha del input al formato adecuado para Date
    const [day, month, year] = fecha.split('/'); // Dividir DD/MM/YYYY
    const selectedDate = new Date(year, month - 1, day); // month - 1 porque Date usa 0-11 para meses
    const today = new Date(); // Fecha y hora actuales del sistema
    today.setHours(0, 0, 0, 0); // Resetear a medianoche para comparar solo fechas
    selectedDate.setHours(0, 0, 0, 0); // Resetear a medianoche

    // Validación de la fecha
    if (selectedDate < today) {
        mostrarMensaje('No puedes reservar para un día anterior al actual. Solo se permiten reservas para hoy o días futuros.', 'red');
        return;
    }

    // Validación de la hora si es el mismo día
    const now = new Date(); // Hora actual del sistema
    if (selectedDate.toDateString() === today.toDateString()) {
        const [hours, minutes] = hora.split(':').map(Number); // Extraer horas y minutos
        const selectedTime = new Date(now); // Usar la fecha actual como base
        selectedTime.setHours(hours, minutes, 0, 0); // Establecer la hora seleccionada

        // Ajustar a formato de 24 horas si es PM (asumiendo que el input usa AM/PM)
        if (hora.toLowerCase().includes('p.m.') && hours !== 12) {
            selectedTime.setHours(hours + 12);
        } else if (hora.toLowerCase().includes('a.m.') && hours === 12) {
            selectedTime.setHours(0);
        }

        if (selectedTime <= now) {
            mostrarMensaje('No puedes reservar para una hora pasada del día actual. Elige una hora futura.', 'red');
            return;
        }
    }

    // Confirmación de la reserva
    if (!confirm('¿Confirmas tu reserva en El Conuco?')) {
        return;
    }

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
        - Fecha: ${fecha}
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
                    mostrarMensaje('¡Reserva enviada con éxito! Te contactaremos pronto. Revisa tu correo para confirmar o cancelar, y hemos notificado al restaurante.', 'var(--primary-color)');
                    document.getElementById('reservaForm').reset();
                    setTimeout(() => {
                        document.getElementById('mensaje').textContent = '';
                        const modal = bootstrap.Modal.getInstance(document.getElementById('reservaModal'));
                        if (modal) modal.hide();
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

// Función para mostrar mensajes
function mostrarMensaje(texto, color) {
    const mensaje = document.getElementById('mensaje');
    if (mensaje) { // Verificar si el elemento existe
        mensaje.textContent = texto;
        mensaje.style.color = color;
        mensaje.style.animation = 'bounceIn 1.5s ease-in-out';
    } else {
        console.error('Elemento con id "mensaje" no encontrado en el DOM.');
    }
}