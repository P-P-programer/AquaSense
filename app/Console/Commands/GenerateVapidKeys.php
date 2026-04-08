<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;

class GenerateVapidKeys extends Command
{
    protected $signature = 'webpush:generate-vapid-keys';
    protected $description = 'Generate VAPID keys for Web Push notifications';

    public function handle(): int
    {
        try {
            $keys = VAPID::createVapidKeys();

            $this->info('✓ VAPID keys generated successfully!');
            $this->line('');
            $this->line('Add these to your .env file:');
            $this->line('');
            $this->warn('VAPID_PUBLIC_KEY=' . $keys['publicKey']);
            $this->warn('VAPID_PRIVATE_KEY=' . $keys['privateKey']);
            $this->line('');

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Failed to generate VAPID keys: ' . $e->getMessage());
            return self::FAILURE;
        }
    }
}
