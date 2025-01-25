import { ChangeEvent } from 'react';

interface UploaderUIProps {
  file: globalThis.File | null;
  isLoading: boolean;
  error: string | null;
  onFileChange: (file: globalThis.File) => void;
}

const UploaderUI = ({ file, isLoading, error, onFileChange }: UploaderUIProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileChange(e.target.files[0]);
    }
  };

  return (
    <div className="gpx-uploader">
      <input 
        type="file"
        accept=".gpx"
        onChange={handleChange}
        disabled={isLoading}
      />
      {isLoading && <div>Processing GPX file...</div>}
      {error && <div className="error">{error}</div>}
      {file && !isLoading && !error && (
        <div>Selected file: {file.name}</div>
      )}
    </div>
  );
};

export default UploaderUI;
