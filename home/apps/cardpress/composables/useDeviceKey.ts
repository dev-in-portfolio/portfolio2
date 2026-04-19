export const useDeviceKey = () => {
  if (process.server) return '';
  const key = useState<string>('cardpress-device-key', () => {
    const existing = localStorage.getItem('cardpress_device_key');
    if (existing) return existing;
    const generated = crypto.randomUUID();
    localStorage.setItem('cardpress_device_key', generated);
    return generated;
  });
  return key.value;
};
