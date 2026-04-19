export const useDeviceKey = () => {
  if (process.server) return '';
  const key = useState<string>('signalgrid-device-key', () => {
    const existing = localStorage.getItem('signalgrid_device_key');
    if (existing) return existing;
    const generated = crypto.randomUUID();
    localStorage.setItem('signalgrid_device_key', generated);
    return generated;
  });
  return key.value;
};
