<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        // No autenticado — puede intentar login
        return ! $this->user();
    }

    public function rules(): array
    {
        return [
            'email'    => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
            'remember' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.required'    => 'El correo electrónico es obligatorio.',
            'email.email'       => 'Ingresa un correo electrónico válido.',
            'password.required' => 'La contraseña es obligatoria.',
            'password.min'      => 'La contraseña debe tener al menos 8 caracteres.',
        ];
    }

    /**
     * Retorna solo los campos necesarios para autenticación.
     *
     * @return array{email: string, password: string, remember: bool}
     */
    public function credentials(): array
    {
        return [
            'email'    => $this->string('email')->lower()->toString(),
            'password' => $this->string('password')->toString(),
            'remember' => $this->boolean('remember'),
        ];
    }
}
