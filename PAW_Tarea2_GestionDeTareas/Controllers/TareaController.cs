using PAW_Tarea2_GestionDeTareas.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Web.Script.Serialization;

namespace PAW_Tarea2_GestionDeTareas.Controllers
{
    public class TareaController : Controller
    {
        private const string ClaveSession = "Tareas";

        public ActionResult Index()
        {
            return View();
        }
        //Este método se encarga de sincronizar las tareas entre el cliente y el servidor.
        //Recibe un JSON con las tareas desde el cliente, lo deserializa y lo guarda en la sesión del servidor.
        //Luego, devuelve una respuesta JSON indicando si la sincronización fue exitosa o no.
        [HttpPost] //Solicitud POST para recibir datos del cliente y modificar el estado del servidor.
        [ValidateAntiForgeryToken] //Comprueba si la solcitud POST contiene un token de verificación válido.
        public JsonResult Sincronizar(string tareasJson)
        {
            //Se utiliza un bloque try-catch para manejar posibles errores
            //que puedan ocurrur durante la deserialización y el almacenamiento de las tareas.
            try
            {
                //Se declara una lista de tareas vacía para almacenar las tareas deserializadas.
                //Si se envia ua lista vacía desde el cliente, se mantiene la lista vacía.
                var tareas = new List<Tarea>();

                //Si el parámetro tareasJson no es nulo ni vacío, se deserializa el JSON a una lista de tareas.
                if (!String.IsNullOrWhiteSpace(tareasJson))
                {
                    //Se crea un objeto JavaScriptSerializer para convertir el JSON a objetos C#.
                    var serializador = new JavaScriptSerializer();
                    //Se deserializa el JSON a una lista de tipo tareas y se asigna a la variable tareas.
                    tareas = serializador.Deserialize<List<Tarea>>(tareasJson);
                }
                //Si la lista de tareas es nula, se inicializa como una lista vacía.
                if (tareas == null)
                {
                    tareas = new List<Tarea>();
                }
                //Se guarda la lista de tareas en la sesión del servidor usando la clave definida.
                Session[ClaveSession] = tareas;
                //Se devuelve una respuesta JSON indicando que la sincronización fue exitosa,
                //junto con un mensaje y la cantidad de tareas sincronizadas.
                return Json(new
                {
                    //Se devuelve una respuesta JSON indicando que la sincronización fue exitosa,
                    ok = true,
                    //Se devuelve un mensaje indicando que las tareas se sincronizaron con la sesión,
                    mensaje = "Las tareas se sincronizaron con Session.",
                    //Se devuelve la cantidad de tareas sincronizadas
                    cantidad = tareas.Count
                });
            }
            //Si ocurre algún error durante la deserialización o el almacenamiento de las tareas,
            catch
            {
                Response.StatusCode = 400;
                // Se devuelve una respuesta JSON indicando que la sincronización falló,
                return Json(new
                {
                    ok = false,
                    mensaje = "No se pudieron sincronizar las tareas."
                });
            }
        }
        //Este método se encarga de obtener las tareas almacenadas en la sesión del servidor.
        private List<Tarea> ObtenerTareasSession()
        {
            //Se declara una variable de tipo List<Tarea> para almacenar las tareas obtenidas de la sesión.
            List<Tarea> tareas;

            //Se verifica si la sesión contiene un objeto de tipo List<Tarea> usando la clave definida.
            if (Session[ClaveSession] is List<Tarea>)
            {
                //Si la sesión contiene un objeto de tipo List<Tarea>, se asigna a la variable tareas.
                tareas = (List<Tarea>)Session[ClaveSession];
            }
            //Si la sesión no contiene un objeto de tipo List<Tarea>, se inicializa una lista vacía y se guarda en la sesión.
            else
            {
                tareas = new List<Tarea>();
                Session[ClaveSession] = tareas;
            }

            return tareas;
        }

        //Este método recive una Tarea enviada desde el cliente
        //Se valida su contenido y la agrega a la lista de tareas
        //almacenadas en la sesión del servidor.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public JsonResult Crear(Tarea tarea)
        {
            //Se valida el modelo de la tarea recibida. Si no es válido, se devuelve un mensaje de error.
            if (!ModelState.IsValid)
            {
                return Json(new
                {
                    ok = false,
                    mensaje = "El título o la descripción no son válidos."
                });
            }
            //Se obtiene la lista de tareas almacenadas en la sesión del servidor.
            var tareas = ObtenerTareasSession();
            //Se valida que el identificador de la tarea sea mayor a cero y que no exista otra tarea con el mismo identificador.
            if (tarea.Id <= 0 || tareas.Exists(t => t.Id == tarea.Id))
            {
                return Json(new
                {
                    ok = false,
                    mensaje = "El identificador de la tarea no es válido."
                });
            }
            //Se establece la fecha de creación y actualización de la tarea como la fecha y hora actual.
            tarea.FechaCreacion = DateTime.Now;
            tarea.FechaActualizacion = tarea.FechaCreacion;
            //Se agrega la tarea a la lista de tareas almacenadas en la sesión del servidor.
            tareas.Add(tarea);
            //Se devuelve una respuesta JSON indicando que la tarea fue creada exitosamente, junto con un mensaje y la tarea creada.
            return Json(new
            {
                ok = true,
                mensaje = "Tarea creada.",
                tarea = tarea
            });
        }

        //Este método recibe una tarea enviada desde el cliente, valida su contenido y
        //actualiza la tarea correspondiente en la lista de tareas almacenadas en
        //la sesión del servidor.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public JsonResult Editar(Tarea tarea)
        {
            //Se valida el modelo de la tarea recibida. Si no es válido,
            //se devuelve un mensaje de error.
            if (!ModelState.IsValid)
            {
                return Json(new
                {
                    ok = false,
                    mensaje = "El título o la descripción no son válidos."
                });
            }
            //Se obtiene la lista de tareas almacenadas en la sesión del servidor.
            var tareas = ObtenerTareasSession();
            //Se busca la tarea correspondiente en la lista de tareas usando el identificador de la tarea recibida.
            var existente = tareas.Find(t => t.Id == tarea.Id);
            //Si no se encuentra la tarea correspondiente, se devuelve un mensaje de error.
            if (existente == null)
            {
                return Json(new
                {
                    ok = false,
                    mensaje = "No se encontró la tarea."
                });
            }
            //Se actualizan los campos de la tarea existente con los valores de la tarea recibida.
            existente.Titulo = tarea.Titulo;
            existente.Descripcion = tarea.Descripcion;
            existente.FechaActualizacion = DateTime.Now;
            //Se devuelve una respuesta JSON indicando que la tarea fue actualizada exitosamente, junto con un mensaje y la tarea actualizada.
            return Json(new
            {
                ok = true,
                mensaje = "Tarea actualizada.",
                tarea = existente
            });
        }
        //Este método recibe un identificador de tarea enviado desde el cliente,
        //busca la tarea correspondiente en la lista de tareas almacenadas en
        //la sesión del servidor y cambia su estado.
        [HttpPost]
        [ValidateAntiForgeryToken]
        public JsonResult CambiarEstado(int id)
        {
            //Se obtiene la lista de tareas almacenadas en la sesión del servidor.
            var tareas = ObtenerTareasSession();
            //Se busca la tarea correspondiente en la lista de tareas usando el identificador recibido.
            var tarea = tareas.Find(t => t.Id == id);
            //Si no se encuentra la tarea correspondiente, se devuelve un mensaje de error.
            if (tarea == null)
            {
                return Json(new
                {
                    ok = false,
                    mensaje = "No se encontró la tarea."
                });
            }
            //Se cambia el estado de la tarea  y se actualiza la fecha de actualización.
            tarea.Estado = !tarea.Estado;
            tarea.FechaActualizacion = DateTime.Now;
            //Se devuelve una respuesta JSON indicando que el estado de la tarea fue actualizado exitosamente, junto con un mensaje y la tarea actualizada.
            return Json(new
            {
                ok = true,
                mensaje = "Estado actualizado.",
                tarea = tarea
            });
        }
        //Este método recibe un identificador de tarea enviado desde el cliente,
        [HttpPost]
        [ValidateAntiForgeryToken]
        public JsonResult Eliminar(int id)
        {
            //Se obtiene la lista de tareas almacenadas en la sesión del servidor.
            var tareas = ObtenerTareasSession();
            //Se busca la tarea correspondiente en la lista de tareas usando el identificador recibido.
            var tarea = tareas.Find(t => t.Id == id);
            //Si no se encuentra la tarea correspondiente, se devuelve un mensaje de error.
            if (tarea == null)
            {
                return Json(new
                {
                    ok = false,
                    mensaje = "No se encontró la tarea."
                });
            }
            //Se elimina la tarea de la lista de tareas almacenadas en la sesión del servidor.
            tareas.Remove(tarea);
            //Se devuelve una respuesta JSON indicando que la tarea fue eliminada exitosamente,
            //junto con un mensaje y el identificador de la tarea eliminada.
            return Json(new
            {
                ok = true,
                mensaje = "Tarea eliminada.",
                id = id
            });
        }
    }
}