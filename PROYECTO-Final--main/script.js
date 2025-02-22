// Inicializar Swiper sin autoplay ni loop
var swiper = new Swiper(".mySwiper", {
    slidesPerView: 1,
    spaceBetween: 30,
    pagination: {
        el: ".swiper-pagination",
        clickable: true,
    },
    navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
    },
});

// Filtro de categorías sin afectar Swiper
document.addEventListener("DOMContentLoaded", function () {
    const filterButtons = document.querySelectorAll(".filter-btn");
    const restaurantSlides = document.querySelectorAll(".swiper-slide.restaurant-section");

    filterButtons.forEach(button => {
        button.addEventListener("click", function () {
            const category = this.getAttribute("data-category");

            // Remover la clase "active" de todos los botones y agregarla al botón seleccionado
            filterButtons.forEach(btn => btn.classList.remove("active"));
            this.classList.add("active");

            // Filtrar los slides dentro del Swiper
            restaurantSlides.forEach(slide => {
                if (slide.getAttribute("data-category") === category) {
                    slide.style.display = "flex"; // Mostrar slide
                } else {
                    slide.style.display = "none"; // Ocultar slide
                }
            });

            // Actualizar Swiper después del filtrado
            swiper.update();
        });
    });
});
