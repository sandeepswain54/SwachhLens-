import { ImagePlus, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { Select } from '@/components/common/Select';
import {
  createVehicle,
  FUEL_TYPES,
  uploadVehicleImage,
  VEHICLE_LOCATIONS,
  VEHICLE_STATUS_LABEL,
  VEHICLE_TYPES,
  type FuelType,
  type VehicleStatus,
} from '@/lib/vehicles';

export function AddVehicleModal({ onClose }: { onClose: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [vehicleNo, setVehicleNo] = useState('');
  const [vehicleType, setVehicleType] = useState<string>(VEHICLE_TYPES[0]);
  const [capacity, setCapacity] = useState('');
  const [model, setModel] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverContact, setDriverContact] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('Diesel');
  const [fuelLevel, setFuelLevel] = useState('100');
  const [status, setStatus] = useState<VehicleStatus>('idle');
  const [location, setLocation] = useState<string>('');
  const [registrationDate, setRegistrationDate] = useState('');
  const [insuranceValidTill, setInsuranceValidTill] = useState('');
  const [fitnessValidTill, setFitnessValidTill] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePickImage(file: File | undefined) {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!vehicleNo.trim()) {
      setError('Vehicle number is required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadVehicleImage(imageFile);
      }

      await createVehicle({
        vehicle_no: vehicleNo,
        vehicle_type: vehicleType,
        capacity_tons: capacity ? Number(capacity) : null,
        model,
        driver_name: driverName,
        driver_contact: driverContact,
        fuel_type: fuelType,
        fuel_level: fuelLevel ? Number(fuelLevel) : 100,
        status,
        location_label: location || undefined,
        image_url: imageUrl,
        registration_date: registrationDate || undefined,
        insurance_valid_till: insuranceValidTill || undefined,
        fitness_valid_till: fitnessValidTill || undefined,
      });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100';
  const labelClass = 'mb-1 block text-[12px] font-medium text-slate-500 dark:text-slate-400';

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-[#141c17]"
        onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 dark:border-white/10 dark:bg-[#141c17]">
          <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">Add Vehicle</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 p-5">
          <div>
            <label className={labelClass}>Vehicle Photo</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-brand-400 hover:text-brand-500 dark:border-white/15 dark:bg-white/5">
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus size={20} />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePickImage(e.target.files?.[0])}
              />
              <p className="text-[12px] text-slate-400">Upload a photo of the vehicle (optional).</p>
            </div>
          </div>

          <div>
            <label className={labelClass}>Vehicle No.</label>
            <input
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              placeholder="e.g. OD-02-AB-1234"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Vehicle Type</label>
              <Select
                value={vehicleType}
                onChange={setVehicleType}
                className={inputClass}
                options={VEHICLE_TYPES.map((t) => ({ value: t, label: t }))}
              />
            </div>
            <div>
              <label className={labelClass}>
                Capacity (Ton) <span className="text-slate-300">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g. 10"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Model <span className="text-slate-300">(optional)</span>
            </label>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. TATA LPK 2518" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Driver Name <span className="text-slate-300">(optional)</span>
              </label>
              <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Full name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>
                Driver Contact <span className="text-slate-300">(optional)</span>
              </label>
              <input
                value={driverContact}
                onChange={(e) => setDriverContact(e.target.value)}
                placeholder="+91 97765 43210"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fuel Type</label>
              <Select
                value={fuelType}
                onChange={(v) => setFuelType(v as FuelType)}
                className={inputClass}
                options={FUEL_TYPES.map((f) => ({ value: f, label: f }))}
              />
            </div>
            <div>
              <label className={labelClass}>Fuel Level (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={fuelLevel}
                onChange={(e) => setFuelLevel(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Status</label>
              <Select
                value={status}
                onChange={(v) => setStatus(v as VehicleStatus)}
                className={inputClass}
                options={(Object.keys(VEHICLE_STATUS_LABEL) as VehicleStatus[]).map((s) => ({
                  value: s,
                  label: VEHICLE_STATUS_LABEL[s],
                }))}
              />
            </div>
            <div>
              <label className={labelClass}>
                Location <span className="text-slate-300">(optional)</span>
              </label>
              <Select
                value={location}
                onChange={setLocation}
                className={inputClass}
                options={[{ value: '', label: 'Unassigned' }, ...Object.keys(VEHICLE_LOCATIONS).map((l) => ({ value: l, label: l }))]}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Registration Date</label>
              <input type="date" value={registrationDate} onChange={(e) => setRegistrationDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Insurance Valid Till</label>
              <input
                type="date"
                value={insuranceValidTill}
                onChange={(e) => setInsuranceValidTill(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Fitness Valid Till</label>
              <input type="date" value={fitnessValidTill} onChange={(e) => setFitnessValidTill(e.target.value)} className={inputClass} />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 w-full rounded-xl bg-brand-500 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
            {submitting ? 'Adding vehicle…' : 'Add Vehicle'}
          </button>
        </form>
      </div>
    </div>
  );
}
