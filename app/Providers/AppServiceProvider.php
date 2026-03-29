<?php

namespace App\Providers;

use App\Contracts\LoginServiceInterface;
use App\Contracts\SessionLogServiceInterface;
use App\Services\LoginService;
use App\Services\SessionLogService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Registra los bindings del contenedor de dependencias.
     *
     * Principio SOLID aplicado: Dependency Inversion.
     * Los controllers dependen de contratos (interfaces), no de implementaciones.
     * Para cambiar la lógica de login (ej: OAuth, LDAP) solo cambia el binding aquí.
     */
    public function register(): void
    {
        $this->app->bind(LoginServiceInterface::class, LoginService::class);
        $this->app->bind(SessionLogServiceInterface::class, SessionLogService::class);
    }

    public function boot(): void
    {
        //
    }
}
