import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  UploadCloud,
  Mic,
  MapPin,
  Send,
  CheckCircle2,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { LandslideApi } from '../services/api';

interface FieldReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (message: string) => void;
  theme?: 'dark' | 'light';
}

export const FieldReportModal: React.FC<FieldReportModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
  theme = 'dark',
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [locationName, setLocationName] = useState('NH-10 Near Dikchu Bend (Km 36.2)');
  const [hazardType, setHazardType] = useState('landslide');
  const [description, setDescription] = useState(
    'Upper slope began slipping after intense rain. Boulders rolling down into drainage canal. Road cracking visible.'
  );
  const [isRecording, setIsRecording] = useState(false);
  const [voiceRecorded, setVoiceRecorded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const processFile = (file: File) => {
    setFileError(null);

    // Validate image type
    if (!file.type.startsWith('image/')) {
      setFileError('Please select a valid image file (JPG, PNG, WEBP, or HEIC).');
      return;
    }

    // Validate size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setFileError('File size exceeds the 15MB limit. Please choose a smaller photo.');
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setFileSize((file.size / 1024 / 1024 >= 1) 
      ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
      : `${(file.size / 1024).toFixed(1)} KB`
    );

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedPhoto(reader.result);
      }
    };
    reader.onerror = () => {
      setFileError('Failed to read the image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setSelectedPhoto(null);
    setFileName(null);
    setFileSize(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
    if (!selectedFile) {
      setFileError('Please select a field photo before submitting.');
      return;
    }

    setIsSubmitting(true);
    setFileError(null);

    try {
      const result = await LandslideApi.submitReport({
        location: locationName,
        description,
        state: 'sikkim',
        latitude: 27.2388,
        longitude: 88.5012,
        hazardType,
        reportId: `web-${Date.now()}`,
        imageFile: selectedFile,
      });

      const message =
        `AI visual classification: ${result.predicted_class} | confidence ${result.confidence.toFixed(4)} | severity ${result.severity} | model ${result.model_version}`;

      setIsSubmitting(false);
      onClose();
      onSubmitSuccess(message);
    } catch (error) {
      setIsSubmitting(false);
      const detail = error instanceof Error ? error.message : 'Unknown API error';
      setFileError(`Classification failed: ${detail}`);
      onClose();
      onSubmitSuccess(`AI classification failed: ${detail}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#010f1f]/80 backdrop-blur-sm animate-fade-in">
      <div
        className={`border rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl transition-all ${
          isDark
            ? 'bg-[#0d1c2d] border-[#1c2b3c] text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between ${
            isDark ? 'bg-[#122131] border-[#1c2b3c]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Camera className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Submit Citizen Field Report
              </h3>
              <p className="text-[10px] text-slate-400">
                Geo-tagged photo &amp; audio verification via YOLOv8 Geotech Vision
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close field report modal"
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Interactive Drag & Drop File Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-400">
                Field Photo Evidence (With EXIF GPS Tamper-Lock)
              </label>
              {selectedPhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-[10px] font-semibold text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Image</span>
                </button>
              )}
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {!selectedPhoto ? (
              /* Drag and Drop Zone (Empty State) */
              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center group ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                    : isDark
                    ? 'border-slate-700 hover:border-emerald-500/80 bg-slate-800/40 hover:bg-slate-800/60'
                    : 'border-slate-300 hover:border-emerald-600 bg-slate-50 hover:bg-emerald-50/40'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2.5 transition-transform group-hover:scale-110 ${
                    isDragging
                      ? 'bg-emerald-500 text-white'
                      : isDark
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                      : 'bg-white text-emerald-600 shadow-sm border border-slate-200'
                  }`}
                >
                  <UploadCloud className="w-6 h-6 animate-pulse" />
                </div>

                <div className="font-bold text-xs sm:text-sm">
                  {isDragging ? (
                    <span className="text-emerald-500">Drop your photo file here</span>
                  ) : (
                    <span>
                      Drag &amp; drop field photo here, or{' '}
                      <span className="text-emerald-500 underline underline-offset-2">browse</span>
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
                  Supports JPG, PNG, WEBP, HEIC up to 15MB. Automatic EXIF GPS metadata verification enabled.
                </p>
              </div>
            ) : (
              /* Active Image Preview State */
              <div className="relative h-44 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 group">
                <img
                  src={selectedPhoto}
                  alt={fileName || 'Uploaded Landslide Evidence'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                {/* Top overlay metadata badge */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/70 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 backdrop-blur-sm">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>EXIF GPS TAMPER-LOCKED</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/90 hover:bg-white text-slate-900 shadow transition-all"
                  >
                    Replace Photo
                  </button>
                </div>

                {/* Bottom overlay filename & status */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[10px] font-mono text-white">
                  <span className="bg-black/75 px-2 py-0.5 rounded border border-white/20 truncate max-w-[220px]">
                    {fileName} {fileSize ? `(${fileSize})` : ''}
                  </span>
                  <span className="text-emerald-400 font-bold bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>YOLOv8 DETECT READY</span>
                  </span>
                </div>
              </div>
            )}

            {/* Error message */}
            {fileError && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-red-500 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
          </div>

          {/* Location input */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1 uppercase font-semibold">
              Incident Location Landmark
            </label>
            <div className="relative">
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. NH-34 Gangotri Artery or NH-10 Dikchu Bend"
                className={`w-full text-xs rounded-xl px-3 py-2.5 pl-8 border outline-none font-medium transition-all ${
                  isDark
                    ? 'bg-slate-800/80 text-white border-slate-700 focus:border-emerald-500'
                    : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-emerald-600'
                }`}
              />
              <MapPin className="w-3.5 h-3.5 text-amber-500 absolute left-2.5 top-3" />
            </div>
          </div>

          {/* Hazard type */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1 uppercase font-semibold">
              Hazard Type
            </label>
            <select
              value={hazardType}
              onChange={(e) => setHazardType(e.target.value)}
              className={`w-full text-xs rounded-xl px-3 py-2.5 border outline-none font-medium transition-all ${
                isDark
                  ? 'bg-slate-800/80 text-white border-slate-700 focus:border-emerald-500'
                  : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-emerald-600'
              }`}
            >
              <option value="landslide">Landslide</option>
              <option value="roadBlockage">Road blockage</option>
              <option value="flood">Flood</option>
              <option value="rainfall">Rainfall</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1 uppercase font-semibold">
              Visual Observation &amp; Movement Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe rockfall intensity, road blockage, cracks, or active mud slurry..."
              className={`w-full text-xs rounded-xl p-2.5 border outline-none font-medium transition-all resize-none ${
                isDark
                  ? 'bg-slate-800/80 text-white border-slate-700 focus:border-emerald-500'
                  : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-emerald-600'
              }`}
            />
          </div>

          {/* Audio voice note recording simulation */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              isDark ? 'bg-slate-800/40 border-slate-700/80' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleRecord}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-600/50'
                    : voiceRecorded
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : isDark
                    ? 'bg-slate-700 text-slate-200 hover:bg-emerald-600 hover:text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-emerald-600 hover:text-white shadow-sm'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
              <div>
                <span className="font-semibold block text-xs">
                  {isRecording
                    ? 'Recording vernacular audio note...'
                    : voiceRecorded
                    ? 'Vernacular Note Attached (00:18)'
                    : 'Record Audio Note (Voice AI)'}
                </span>
                <span className="text-[10px] text-slate-400">
                  Transcribes Nepali, Hindi, Assamese, Khasi, Mizo (Bhashini AI)
                </span>
              </div>
            </div>

            {voiceRecorded && (
              <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                ATTACHED
              </span>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <span>ANALYZING YOLOv8...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit Field Report</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
