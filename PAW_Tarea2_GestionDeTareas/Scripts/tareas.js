$(function () {

    var claveLocalStorage = "tareasApp";

    var $app = $("#tareasApp");
    //Formulario de tareas
    var $formulario = $("#formTarea");
    //Lista de tareas
    var $listaDeTareas = $("#listaTareas");
    //Elemento para mostrar mensajes al usuario
    var $mensaje = $("#mensaje");

    // Función para mostrar mensajes al usuario
    function mostrarMensaje(texto) {
        $mensaje.text(texto);
    }

    // Objeto que contiene las URLs de las acciones del servidor
    // Se obtienen de los atributos data-* del elemento principal de la aplicación
    // Esto permite que las URLs se configuren desde el servidor y se mantengan consistentes con las rutas definidas en el backend
    var urls = {
        sincronizar: $app.data("url-sincronizar"),
        crear: $app.data("url-crear"),
        editar: $app.data("url-editar"),
        estado: $app.data("url-estado"),
        eliminar: $app.data("url-eliminar")
    };

    // Guarda los datos que JavaScript necesita para mostrar y manejar la página.
    // Contiene la lista de tareas, el filtro actual y el ID de la tarea que se está editando.
    var estadoPagina = {
        tareas: obtenerTareas(),
        filtro: "Todas",
        idEditando: null
    };


    //Funcion para obtener el siguiente ID disponible para una nueva tarea
    function nuevoId() {
        var mayorId = 0;

        for (var i = 0; i < estadoPagina.tareas.length; i++) {
            var idActual = estadoPagina.tareas[i].Id;

            if (idActual > mayorId) {
                mayorId = idActual;
            }
        }

        return mayorId + 1;
    }

    //Funcion para obtener las tareas desde el LocalStorage
    function obtenerTareas() {
        //Try-catch para manejar errores al obtener datos del LocalStorage
        try {
            // Intentar obtener las tareas desde el LocalStorage
            var datos = localStorage.getItem(claveLocalStorage);

            if (datos === null) {
                return [];
            }

            return JSON.parse(datos);
        } catch (error) {
            return [];
        }
    }
    //Funcion para guardar las tareas en el LocalStorage
    function guardarTareas() {
        localStorage.setItem(
            claveLocalStorage,
            JSON.stringify(estadoPagina.tareas)
        );
    }



    function enviarAjax(url, datos) {
        // Asegurarse de que los datos no sean nulos
        if (datos === null) {
            datos = {};
        }
        // Agregar el token de verificación de solicitud a los datos
        datos.__RequestVerificationToken =
            $('input[name="__RequestVerificationToken"]').val();
        // Realizar la petición AJAX al servidor
        return $.ajax({
            url: url,
            type: "POST",
            data: datos,
            dataType: "json"
        });
    }
    //Funcion para mostrar el resultado de la petición AJAX al servidor
    function mostrarResultadoServidor(respuesta) {
        // Si la respuesta es válida y tiene un estado "ok", mostrar el mensaje del servidor
        if (respuesta && respuesta.ok) {
            mostrarMensaje(respuesta.mensaje);
        } else {
            //Si no se recibió una respuesta válida del servidor, mostrar un mensaje de error
            mostrarMensaje(
                "La tarea quedó guardada en este navegador, " +
                "pero Session no se actualizó: "
            );
        }
    }
    //Funcion para mostrar un mensaje de error en caso de fallo de conexión con el servidor
    function mostrarFalloDeConexion(xhr) {

        console.error("Falló la petición AJAX. Error HTTP " + xhr.status);

        mostrarMensaje(
            "Las tareas siguen en LocalStorage, pero Session no se sincronizó. " +
            "Error HTTP " + xhr.status
        );
    }

    function renderizarTareas() {
        // Limpiar la lista de tareas antes de renderizar
        $listaDeTareas.empty();
        // Crear un arreglo para almacenar las tareas que se mostrarán según el filtro seleccionado
        var tareasVisibles = [];

        // Recorrer todas las tareas y aplicar el filtro seleccionado para determinar cuáles se mostrarán
        for (var i = 0; i < estadoPagina.tareas.length; i++) {
            var tarea = estadoPagina.tareas[i];
            // Aplicar el filtro seleccionado para determinar si la tarea debe mostrarse
            if (estadoPagina.filtro === "Todas") {
                tareasVisibles.push(tarea);
            } else if (
                estadoPagina.filtro === "Pendientes" &&
                tarea.Estado === false
            ) {
                tareasVisibles.push(tarea);
            } else if (
                estadoPagina.filtro === "Completadas" &&
                tarea.Estado === true
            ) {
                tareasVisibles.push(tarea);
            }
        }
        // Si no hay tareas visibles según el filtro, mostrar un mensaje indicando que no hay tareas para mostrar
        if (tareasVisibles.length === 0) {
            $("<li>")
                .text("No hay tareas para mostrar.")
                .appendTo($listaDeTareas);
            return;
        }

        // Recorrer las tareas visibles y crear elementos HTML para cada una, 
        //agregándolos a la lista de tareas
        tareasVisibles.forEach(function (tarea) {
            var $elemento = $("<li>")
                .addClass("list-group-item")
                .attr("data-id", tarea.Id);

            var $encabezado = $("<div>")
                .addClass("clearfix");

            $("<strong>")
                .addClass("h4")
                .text(tarea.Titulo)
                .appendTo($encabezado);

            var claseEstado = tarea.Estado
                ? "label label-success pull-right"
                : "label label-warning pull-right";

            $("<span>")
                .addClass(claseEstado)
                .css("margin-left", "45px")
                .text(tarea.Estado ? "Completada" : "Pendiente")
                .appendTo($encabezado);

            $elemento.append($encabezado);

            $("<p>")
                .addClass("list-group-item-text")
                .text(tarea.Descripcion || "Sin descripción")
                .appendTo($elemento);

            var $botones = $("<div>")
                .addClass("btn-group btn-group-sm");

            $("<button>", {
                type: "button",
                class: "btn btn-secondary boton-estado"
            })
                .text(tarea.Estado ? "Marcar pendiente" : "Completar")
                .appendTo($botones);

            $("<button>", {
                type: "button",
                class: "btn btn-primary boton-editar"
            })
                .text("Editar")
                .appendTo($botones);

            $("<button>", {
                type: "button",
                class: "btn btn-danger boton-eliminar"
            })
                .text("Eliminar")
                .appendTo($botones);

            $elemento.append($botones);
            $listaDeTareas.append($elemento);
        });
    }

    //Funcion para sincronizar las tareas con la sesión del servidor mediante una petición AJAX
    function sincronizarConSession() {
        // Se envía una petición AJAX al servidor para sincronizar las tareas 
        //almacenadas en el LocalStorage con la sesión del servidor
        enviarAjax(urls.sincronizar, {
            // Se envía el arreglo de tareas como un JSON stringificado para que el servidor pueda procesarlo
            tareasJson: JSON.stringify(estadoPagina.tareas)
        })
            // Se maneja la respuesta del servidor en caso de éxito
            .done(function (respuesta) {
                mostrarResultadoServidor(respuesta);
            })
            //Se maneja la respuesta del servidor en caso de error
            .fail(function (xhr, estado, error) {
                mostrarFalloDeConexion(xhr, estado, error);
            });
    }
    //Funcion para limpiar el formulario de tareas
    function limpiarFormulario() {
        estadoPagina.idEditando = null;
        $formulario[0].reset();
        $("#tareaId").val("");
        $("#botonGuardar").text("Agregar tarea");
        $("#botonCancelar").prop("hidden", true);
    }

    //Evento para manejar el envío del formulario de tareas
    $formulario.on("submit", function (evento) {
        // Prevenir el comportamiento por defecto del formulario
        evento.preventDefault();
        //Obtener los valores del título y la descripción de la tarea
        var titulo = $("#titulo").val().trim();
        var descripcion = $("#descripcion").val().trim();
        //Validar que el título no esté vacío
        if (!titulo) {
            mostrarMensaje("Escribe el título de la tarea.");
            return;
        }
        //Se valida que en el objeto estadoPagina no haya un idEditando, 
        //si es null se crea una nueva tarea, si no se edita la tarea existente
        if (estadoPagina.idEditando === null) {
            //Se obtiene la fecha actual en formato ISO 
            //para registrar la fecha de creación y actualización de la tarea
            var fechaActual = new Date().toISOString();
            //Se crea un objeto tareaNueva con los datos de la nueva tarea
            var tareaNueva = {
                Id: nuevoId(),
                Titulo: titulo,
                Descripcion: descripcion,
                Estado: false,
                FechaCreacion: fechaActual,
                FechaActualizacion: fechaActual
            };
            //Se agrega la nueva tarea al arreglo de tareas en estadoPagina
            estadoPagina.tareas.push(tareaNueva);
            //Se guarda el arreglo de tareas en el LocalStorage
            guardarTareas();
            //Se renderiza la lista de tareas en la página
            renderizarTareas();
            //se limpia el formulario para permitir agregar otra tarea
            limpiarFormulario();

            //Se envía la nueva tarea al servidor mediante una petición AJAX
            enviarAjax(urls.crear, {
                Id: tareaNueva.Id,
                Titulo: tareaNueva.Titulo,
                Descripcion: tareaNueva.Descripcion
            })
                .done(function (respuesta) {
                    mostrarResultadoServidor(respuesta);
                })
                .fail(function (xhr, estado, error) {
                    mostrarFalloDeConexion(xhr, estado, error);
                });

            return;
        }

        //Si se está editando una tarea
        //Se crea una variable tarea para almacenar la tarea que se está editando
        var tarea = null;
        //Se recorre el arreglo de tareas en estadoPagina para 
        //encontrar la tarea con el ID que se está editando
        for (var i = 0; i < estadoPagina.tareas.length; i++) {
            //Si se encuentra la tarea con el ID que se está editando, se asigna a la variable tarea y se rompe el ciclo
            if (estadoPagina.tareas[i].Id == estadoPagina.idEditando) {
                tarea = estadoPagina.tareas[i];
                break;
            }
        }
        //Si no se encuentra la tarea, 
        //se muestra un mensaje de error y se limpia el formulario
        if (!tarea) {
            mostrarMensaje("No se encontró la tarea que intentas editar.");
            limpiarFormulario();
            return;
        }
        //Si se encuentra la tarea, se actualizan sus propiedades con los nuevos valores del formulario
        tarea.Titulo = titulo;
        tarea.Descripcion = descripcion;
        tarea.FechaActualizacion = new Date().toISOString();

        //Se guarda el arreglo de tareas en el LocalStorage
        guardarTareas();
        //Se renderiza la lista de tareas en la página
        renderizarTareas();
        //Se limpia el formulario para permitir agregar otra tarea
        limpiarFormulario();

        //Se envía la tarea editada al servidor mediante una petición AJAX
        enviarAjax(urls.editar, {
            Id: tarea.Id,
            Titulo: tarea.Titulo,
            Descripcion: tarea.Descripcion
        })
            //Se maneja la respuesta del servidor en caso de éxito
            .done(function (respuesta) {
                mostrarResultadoServidor(respuesta);
            })
            //Se maneja la respuesta del servidor en caso de error
            .fail(function (xhr, estado, error) {
                mostrarFalloDeConexion(xhr, estado, error);
            });
    });

    $listaDeTareas.on("click", ".boton-editar", function () {
        //Se obtiene el ID de la tarea a editar a partir del atributo data-id del elemento li que contiene el botón clickeado
        var id = Number($(this).closest("li").attr("data-id"));
        //Se inicializa la variable tarea como null para almacenar la tarea correspondiente al ID
        var tarea = null;
        //Se recorre el arreglo de tareas en estadoPagina para encontrar la tarea con el ID correspondiente
        for (var i = 0; i < estadoPagina.tareas.length; i++) {
            if (Number(estadoPagina.tareas[i].Id) === id) {
                tarea = estadoPagina.tareas[i];
                break;
            }
        }
        //Si no se encuentra la tarea, se retorna y no se realiza ninguna acción
        if (tarea === null) {
            return;
        }

        //Se actualiza el estado de la página para indicar que se está editando la tarea con el ID correspondiente
        estadoPagina.idEditando = tarea.Id;
        //Se llenan los campos del formulario con los datos de la tarea a editar
        $("#tareaId").val(tarea.Id);
        $("#titulo").val(tarea.Titulo);
        $("#descripcion").val(tarea.Descripcion);
        //Se actualizan los textos de los botones para reflejar que se está editando una tarea
        $("#botonGuardar").text("Guardar cambios");
        $("#botonCancelar").prop("hidden", false);

    });
    //Evento para manejar el clic en el botón de cancelar edición
    //Limpia el formulario 
    $("#botonCancelar").on("click", limpiarFormulario);

    //Evento para manejar el clic en el botón de cambiar estado de la tarea
    $listaDeTareas.on("click", ".boton-estado", function () {
        //Se obtiene el elemento li que contiene la tarea correspondiente al botón clickeado
        var $elementoTarea = $(this).closest("li");
        //Se obtiene el ID de la tarea a partir del atributo data-id del elemento li
        var id = Number($elementoTarea.attr("data-id"));
        //Se inicializa la variable tarea como null para almacenar la tarea correspondiente al ID
        var tarea = null;
        //Se recorre el arreglo de tareas en estadoPagina para encontrar la tarea con el ID correspondiente
        for (var i = 0; i < estadoPagina.tareas.length; i++) {
            if (Number(estadoPagina.tareas[i].Id) === id) {
                tarea = estadoPagina.tareas[i];
                break;
            }
        }
        //Si no se encuentra la tarea, se retorna y no se realiza ninguna acción
        if (tarea === null) {
            return;
        }
        //Se cambia el estado de Estado de la tarea 
        tarea.Estado = !tarea.Estado;
        //Se actualiza la fecha de actualización de la tarea con la fecha actual en formato ISO
        tarea.FechaActualizacion = new Date().toISOString();
        //Se guarda el arreglo de tareas en el LocalStorage
        guardarTareas();
        //Se renderiza la lista de tareas en la página para reflejar el cambio de estado
        renderizarTareas();
        //Se envía la tarea con el nuevo estado al servidor mediante una petición AJAX 
        enviarAjax(urls.estado, { id: tarea.Id })
            //Se maneja la respuesta del servidor en caso de éxito
            .done(function (respuesta) {
                mostrarResultadoServidor(respuesta);
            })
            //Se maneja la respuesta del servidor en caso de error
            .fail(function (xhr, estado, error) {
                mostrarFalloDeConexion(xhr, estado, error);
            });
    });

    $listaDeTareas.on("click", ".boton-eliminar", function () {
        //Se obtiene el ID de la tarea a eliminar a partir del atributo data-id del elemento li que contiene el botón clickeado
        var id = Number($(this).closest("li").attr("data-id"));
        //Se muestra un cuadro de confirmación al usuario para confirmar la eliminación de la tarea
        if (!window.confirm("¿Quieres eliminar esta tarea?")) {
            return;
        }
        //Se crea un nuevo arreglo de tareas que contiene todas las tareas excepto la que se va a eliminar
        var tareasRestantes = [];
        //Se recorre el arreglo de tareas en estadoPagina y se agregan al nuevo arreglo todas las tareas cuyo ID no coincida con el ID de la tarea a eliminar
        for (var i = 0; i < estadoPagina.tareas.length; i++) {
            var tarea = estadoPagina.tareas[i];

            if (Number(tarea.Id) !== id) {
                tareasRestantes.push(tarea);
            }
        }
        //Se actualiza el arreglo de tareas en estadoPagina con el nuevo arreglo que no contiene la tarea eliminada
        estadoPagina.tareas = tareasRestantes;
        //Se guarda el arreglo de tareas en el LocalStorage
        guardarTareas();
        //Se renderiza la lista de tareas en la página para reflejar la eliminación de la tarea
        renderizarTareas();
        //Se envía una petición AJAX al servidor para eliminar la tarea correspondiente al ID
        enviarAjax(urls.eliminar, { id: id })
            .done(mostrarResultadoServidor)
            .fail(mostrarFalloDeConexion);
    });

    //Se escucha el evento de cambio en el elemento select con id "filtro" 
    //para actualizar el filtro de tareas y renderizar la lista de tareas según el filtro seleccionado
    $("#filtro").on("change", function () {
        //Se actualiza el filtro de tareas en estadoPagina con el valor seleccionado en el elemento select
        estadoPagina.filtro = $(this).val();
        //Se renderiza la lista de tareas en la página según el filtro seleccionado
        renderizarTareas();
    });
    //Se guarda el arreglo de tareas en el LocalStorage
    guardarTareas();
    //Se renderiza la lista de tareas en la página
    renderizarTareas();
    //Se sincronizan las tareas con la sesión del servidor mediante una petición AJAX
    sincronizarConSession();
});