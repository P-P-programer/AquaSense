# Establece tu contraseña

Hola {{ $userName }},

Tu cuenta en **AquaSense** ha sido creada correctamente. Para completar el proceso y acceder al sistema, debes establecer tu contraseña.

@component('mail::button', ['url' => $resetUrl])
Establecer contraseña
@endcomponent

Este enlace es válido por **24 horas**. Si no lo usas en ese tiempo, solicita uno nuevo al administrador.

---

**¿Preguntas?** Contacta al administrador de AquaSense.

Gracias,  
El equipo de AquaSense