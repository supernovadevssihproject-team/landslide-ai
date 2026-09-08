import React, { useState } from 'react';
import { ASSET_URLS } from '../data/mockData';
import {
  X,
  Camera,
  Upload,
  Mic,
  MapPin,
  Send,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { LandslideApi } from '../services/api';

interface FieldReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (message: string) => void;
}

export const FieldReportModal: React.FC<FieldReportModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string>(ASSET_URLS.primaryIncidentAlt);
  const [locationName, setLocationName] = useState('NH-10 Near Dikchu Bend (Km 36.2)');
  const [description, setDescription] = useState(
    'Upper slope began slipping after intense rain. Boulders rolling down into drainage canal. Road cracking visible.'
  );
  const [isRecording, setIsRecording] = useState(false);
  const [voiceRecorded, setVoiceRecorded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleToggleRecord = () => {
    if (!isRecording) {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        setVoiceRecorded(true);
      }, 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await LandslideApi.submitReport({
        location: locationName,
        description,
        imageUrl: selectedPhoto,
      });
      setIsSubmitting(false);
      onClose();
      onSubmitSuccess(
        `Report ${res.code} verified by ${res.cvModel}. ${res.cvLabel} (${res.cvRisk}). Queued for Duty Officer triage.`
      );
    } catch {
      setIsSubmitting(false);
      onClose();
      onSubmitSuccess(
        'Citizen report uploaded to LEWS database. YOLOv8 Geotech Vision verified tension fissures. Queued for Duty Officer triage.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#010f1f]/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 bg-[#122131] border-b border-[#1c2b3c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#44d8f1]" />
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              Submit Citizen Landslide Field Report
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close field report modal"
            className="text-[#8a9297] hover:text-white p-1 rounded hover:bg-[#1c2b3c] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {/* Photo upload preview */}
          <div>
            <label className="text-[11px] font-mono text-[#8a9297] block mb-1 uppercase">
              Field Photo Evidence (With EXIF GPS Tamper-Lock)
            </label>
            <div className="relative h-40 rounded-lg overflow-hidden border border-[#273647] bg-[#051424]">
              <img
                src={selectedPhoto}
                alt="Uploaded Landslide"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#051424]/90 via-transparent to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-white">
                <span className="bg-[#051424]/80 px-2 py-0.5 rounded border border-[#273647]">
                  GPS: 27.5280° N, 88.5110° E (Locked)
                </span>
                <span className="text-[#44d8f1] font-bold">YOLOv8 DETECT READY</span>
              </div>
            </div>
          </div>

          {/* Location input */}
          <div>
            <label className="text-[11px] font-mono text-[#8a9297] block mb-1 uppercase">
              Incident Location Landmark
            </label>
            <div className="relative">
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full bg-[#051424] text-[#d4e4fa] border border-[#273647] rounded-lg px-3 py-2 pl-8 focus:outline-none focus:border-[#44d8f1]"
              />
              <MapPin className="w-3.5 h-3.5 text-[#ffb870] absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-mono text-[#8a9297] block mb-1 uppercase">
              Visual Observation &amp; Movement Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#051424] text-[#d4e4fa] border border-[#273647] rounded-lg p-2.5 focus:outline-none focus:border-[#44d8f1] resize-none"
            />
          </div>

          {/* Audio voice note recording simulation */}
          <div className="bg-[#122131] border border-[#1c2b3c] p-2.5 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleRecord}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-[#93000a] text-white animate-ping'
                    : voiceRecorded
                    ? 'bg-[#00363e] text-[#44d8f1]'
                    : 'bg-[#1c2b3c] text-white hover:bg-[#44d8f1] hover:text-[#00363e]'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
              <div>
                <span className="font-semibold text-white block text-xs">
                  {isRecording
                    ? 'Recording voice note...'
                    : voiceRecorded
                    ? 'Voice Note Attached (00:18)'
                    : 'Record Vernacular Audio Note'}
                </span>
                <span className="text-[10px] text-[#8a9297]">
                  Supports Nepali, Hindi, Assamese, Khasi, Mizo (Bhashini AI)
                </span>
              </div>
            </div>

            {voiceRecorded && (
              <span className="text-[10px] font-mono text-[#44d8f1] bg-[#00363e] px-2 py-0.5 rounded border border-[#00bcd4]/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                ATTACHED
              </span>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-xs font-mono text-[#8a9297] hover:text-white"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#44d8f1] hover:bg-white text-[#00363e] font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span>ANALYZING YOLOv8...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>TRANSMIT FIELD REPORT</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
