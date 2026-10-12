import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LocationSelector } from '../../src/features/dashboard/components/LocationSelector';
import { HospitalSelector } from '../../src/features/hospitals/components/HospitalSelector';

describe('dashboard control workflow', () => {
  it('lets the dispatcher change the active map selection mode', async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(<LocationSelector pickup={null} destination={null} selectionMode="pickup" onModeChange={onModeChange} onClearPickup={() => {}} onClearDestination={() => {}} />);
    await user.click(screen.getByRole('button', { name: /click map to set destination/i }));
    expect(onModeChange).toHaveBeenCalledWith('destination');
  });

  it('selects a hospital as a destination candidate', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const hospital = { id: 'h1', name: 'Test Hospital', address: 'Central area', lat: 28.6, lng: 77.2 };
    render(<HospitalSelector hospitals={{ items: [hospital], status: 'success', source: 'demo' }} selectedHospitalId={null} onSelect={onSelect} onRetry={() => {}} />);
    await user.click(screen.getByRole('button', { name: /test hospital/i }));
    expect(onSelect).toHaveBeenCalledWith(hospital);
  });
});
