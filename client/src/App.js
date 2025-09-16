import React, { useState } from "react";

function parseRecipients(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",");
      if (parts.length >= 2)
        return { name: parts[0].trim(), email: parts[1].trim() };
      return { name: "", email: parts[0].trim() };
    });
}

// Notification Component
const Notification = ({ message, type, onClose }) => (
  <div
    style={{
      position: "fixed",
      top: 20,
      right: 20,
      background: type === "success" ? "#27ae60" : "#e74c3c",
      color: "#fff",
      padding: "16px 24px",
      borderRadius: 14,
      boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
      fontWeight: 600,
      fontFamily: "Roboto, sans-serif",
      zIndex: 1000,
    }}
  >
    {message}
    <button
      onClick={onClose}
      style={{
        marginLeft: 12,
        background: "transparent",
        border: "none",
        color: "#fff",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      ✕
    </button>
  </div>
);

export default function App() {
  const [recipients, setRecipients] = useState([{ name: "Asha", email: "ash48297@gmail.com" }]);
  const [subject, setSubject] = useState("Hello {{name}} — quick note");
  const [body, setBody] = useState("Hi {{name}},\n\nThis is a test email sent in one click.\n\nRegards,\nAsha");
  const [fromEmail, setFromEmail] = useState("you@example.com");
  const [fromName, setFromName] = useState("Asha Mol");
  const [sending, setSending] = useState(false);
  const [concurrency, setConcurrency] = useState(5);
  const [imageType, setImageType] = useState("url");
  const [imageURL, setImageURL] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [notification, setNotification] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("fromName", fromName);
      formData.append("fromEmail", fromEmail);
      formData.append("subject", subject);
      formData.append("body", body);
      formData.append("recipients", JSON.stringify(recipients));
      formData.append("concurrency", concurrency);
      formData.append("imageType", imageType);
      if (imageType === "url") formData.append("imagePath", imageURL);
      else if (imageType === "local" && imageFile) formData.append("file", imageFile);
      if (attachmentFile) formData.append("file", attachmentFile);

      const resp = await fetch("/send", { method: "POST", body: formData });
      const data = await resp.json();

      setNotification(data.ok
        ? { type: "success", message: "Emails sent successfully!" }
        : { type: "error", message: data.error || "Failed to send emails!" }
      );
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      setNotification({ type: "error", message: err.message });
      setTimeout(() => setNotification(null), 3000);
    } finally { setSending(false); }
  }

  const renderBodyPreview = body.replace(/{{name}}/g, "John Doe");
  const renderSubjectPreview = subject.replace(/{{name}}/g, "John Doe");

  return (
    <div className="container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600&family=Roboto:wght@400;500&display=swap');
        body { background: #f7f7f7; margin:0; font-family:'Roboto', sans-serif; color:#333; }
        .container { max-width: 1400px; margin:20px auto; padding:20px; position:relative; }

        h2 { text-align:center; font-size:32px; font-family:'Montserrat', sans-serif; font-weight:600; color:#2c3e50; margin-bottom:30px; }

        .grid { display:grid; grid-template-columns: 1fr 1fr; gap:30px; }
        @media(max-width:900px){ .grid{ grid-template-columns:1fr; } }

        .card { background: #fff; border-radius: 20px; padding: 30px; box-shadow: 4px 4px 12px rgba(0,0,0,0.1), -4px -4px 12px rgba(0,0,0,0.05); transition:0.3s; max-height:600px; overflow-y:auto; }
        .card:hover { box-shadow: inset 2px 2px 8px rgba(0,0,0,0.05), inset -2px -2px 8px rgba(0,0,0,0.02); }

        table { width:100%; border-collapse:collapse; margin-top:15px; }
        th, td { padding:12px; text-align:left; font-size:14px; font-family:'Roboto', sans-serif; }
        th { background:#ecf0f1; color:#2c3e50; font-weight:600; border-radius:8px 8px 0 0; }
        tr:hover { background:#f1f1f1; }

        label { display:block; margin-bottom:6px; font-weight:500; font-family:'Montserrat', sans-serif; color:#2c3e50; }

        input, textarea, select { width: 90%; padding: 12px 16px; margin-bottom: 12px; border: 1px solid #ccc; border-radius: 12px; font-size: 15px; font-family: 'Roboto', sans-serif; background: #fff; color: #333; box-shadow: inset 2px 2px 4px rgba(0,0,0,0.05); transition:0.3s; display: block; }
        input:focus, textarea:focus, select:focus { outline:none; border-color:#2980b9; box-shadow: 0 0 8px #2980b9; }

        .add-btn { margin-top:10px; display:inline-block; background:#2980b9; color:#fff; padding:12px 20px; border:none; border-radius:14px; cursor:pointer; font-weight:600; font-family:'Montserrat', sans-serif; font-size:15px; transition:0.3s; }
        .add-btn:hover { background:#1f6090; }

        .remove-btn { background:#e74c3c; color:white; border:none; padding:8px 14px; border-radius:12px; cursor:pointer; font-size:13px; font-family:'Roboto', sans-serif; transition:0.3s; }
        .remove-btn:hover { background:#c0392b; }

        .top-right-buttons { position: fixed; top: 20px; right: 20px; display:flex; gap:10px; z-index:1000; }
        .send-btn, .preview-btn { background:#27ae60; color:white; padding:12px 20px; border:none; border-radius:20px; cursor:pointer; font-weight:600; font-family:'Montserrat', sans-serif; transition:0.3s; font-size:16px; }
        .send-btn:hover, .preview-btn:hover { background:#1f8a4f; }

        .modal { position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; z-index:2000; }
        .modal-content { background:#fff; padding:30px; border-radius:20px; max-width:600px; width:90%; max-height:80%; overflow-y:auto; color:#333; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
        .modal-content img { max-width:100%; border-radius:14px; margin-bottom:15px; }
        .close-btn { background:#e74c3c; border:none; color:#fff; padding:8px 14px; border-radius:12px; cursor:pointer; margin-bottom:10px; }
      `}</style>

      <h2>📨 Bulk Mailer</h2>

      {/* Top-right Send & Preview */}
      <div className="top-right-buttons">
        <button className="preview-btn" onClick={()=>setPreviewOpen(true)}>Preview</button>
        <button className="send-btn" onClick={handleSend} disabled={sending}>
          {sending ? "Sending…" : `Send to ${recipients.length} recipients`}
        </button>
      </div>

      <div className="grid">
        {/* Recipients card */}
        <div className="card">
          <label><b>Recipients</b> — format: <code>Name,email</code></label>
          <table>
            <thead><tr><th>Name</th><th>Email</th></tr></thead>
            <tbody>
              {recipients.map((r,i)=>(
                <tr key={i}>
                  <td><input value={r.name} onChange={(e)=>{const c=[...recipients];c[i].name=e.target.value;setRecipients(c);}}/></td>
                  <td><input value={r.email} onChange={(e)=>{const c=[...recipients];c[i].email=e.target.value;setRecipients(c);}}/></td>
                  <td><button className="remove-btn" onClick={()=>setRecipients(recipients.filter((_,idx)=>idx!==i))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="add-btn" onClick={()=>setRecipients([...recipients,{name:"",email:""}])}>➕ Add Row</button>
        </div>

        {/* Email content card */}
        <div className="card">
          <label>From Name</label>
          <input value={fromName} onChange={(e)=>setFromName(e.target.value)}/>
          <label>From Email</label>
          <input value={fromEmail} onChange={(e)=>setFromEmail(e.target.value)}/>
          <label>Subject</label>
          <input value={subject} onChange={(e)=>setSubject(e.target.value)}/>
          <label>Body</label>
          <textarea rows={8} value={body} onChange={(e)=>setBody(e.target.value)}/>
          <label>Header Image (Optional)</label>
          <select value={imageType} onChange={(e)=>setImageType(e.target.value)}>
            <option value="url">URL</option>
            <option value="local">Local Upload</option>
          </select>
          {imageType==="url" ? <input type="text" placeholder="Image URL" value={imageURL} onChange={(e)=>setImageURL(e.target.value)}/> : <input type="file" accept="image/*" onChange={(e)=>setImageFile(e.target.files[0])}/>}
          <label>Optional Attachment</label>
          <input type="file" onChange={(e)=>setAttachmentFile(e.target.files[0])}/>
          <label>Concurrency</label>
          <input type="number" min={1} value={concurrency} onChange={(e)=>setConcurrency(Number(e.target.value))}/>
        </div>
      </div>

      {/* Preview Modal */}
      {previewOpen && (
        <div className="modal" onClick={()=>setPreviewOpen(false)}>
          <div className="modal-content" onClick={e=>e.stopPropagation()}>
            <button className="close-btn" onClick={()=>setPreviewOpen(false)}>Close ✕</button>
            {imageURL && <img src={imageURL} alt="Header"/>}
            <h4>{renderSubjectPreview}</h4>
            <p>{renderBodyPreview}</p>
            <p><b>From:</b> {fromName} &lt;{fromEmail}&gt;</p>
          </div>
        </div>
      )}

      {notification && <Notification message={notification.message} type={notification.type} onClose={()=>setNotification(null)}/>}
    </div>
  );
}
