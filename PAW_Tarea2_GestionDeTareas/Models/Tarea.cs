using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Web;

namespace PAW_Tarea2_GestionDeTareas.Models
{
    public class Tarea
    {
        public int Id { get; set; }

        [Required(ErrorMessage = "El título es obligatorio.")]
        [StringLength(
            100,
            MinimumLength = 3,
            ErrorMessage = "El título debe tener entre 3 y 100 caracteres."
        )]
        [Display(Name = "Título")]
        public string Titulo { get; set; }

        [StringLength(
            500,
            ErrorMessage = "La descripción no puede superar los 500 caracteres."
        )]
        [Display(Name = "Descripción")]
        public string Descripcion { get; set; }

        [Display(Name = "Completada")]
        public bool Estado { get; set; }

        [Required(ErrorMessage = "La fecha de creación es obligatoria.")]
        [DataType(DataType.DateTime)]
        [Display(Name = "Fecha de creación")]
        public DateTime FechaCreacion { get; set; }

        [Required(ErrorMessage = "La fecha de actualización es obligatoria.")]
        [DataType(DataType.DateTime)]
        [Display(Name = "Fecha de actualización")]
        public DateTime FechaActualizacion { get; set; }
    }
}