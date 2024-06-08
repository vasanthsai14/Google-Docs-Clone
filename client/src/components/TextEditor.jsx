// client/src/components/TextEditor.jsx
import React, { useCallback, useEffect, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";
import QuillCursors from 'quill-cursors';
import Header from './Header';

Quill.register('modules/cursors', QuillCursors);

const SAVE_INTERVAL_MS = 1000;

const TOOLBAR_OPTIONS = [
  [{ header: '1' }, { header: '2' }, { header: [false, 3, 4, 5, 6] }],
  [{ font: [] }],
  [{ size: ['small', false, 'large', 'huge'] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ direction: 'rtl' }],
  [{ align: [] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  ['blockquote', 'code-block'],
  ['formula'],
  ['clean'],
  ['image'] // Change this to just 'image'
];

export default function TextEditor() {
  const { id: documentId } = useParams();
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();
  const [documentTitle, setDocumentTitle] = useState("Loading...");

  useEffect(() => {
    const s = io("http://localhost:3001");
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    if (socket == null || quill == null) return;

    socket.once("load-document", document => {
      quill.setContents(document.contents);
      quill.enable();
      setDocumentTitle(document.title); // Set the document title
    });

    socket.emit("get-document", documentId);
  }, [socket, quill, documentId]);

  useEffect(() => {
    if (socket == null || quill == null) return;

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents());
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [socket, quill]);

  useEffect(() => {
    if (socket == null || quill == null) return;

    const handler = delta => {
      quill.updateContents(delta);
    };
    socket.on("receive-changes", handler);

    return () => {
      socket.off("receive-changes", handler);
    };
  }, [socket, quill]);

  useEffect(() => {
    if (socket == null || quill == null) return;

    const handler = (delta, oldDelta, source) => {
      if (source !== "user") return;
      socket.emit("send-changes", delta);
    };
    quill.on("text-change", handler);

    return () => {
      quill.off("text-change", handler);
    };
  }, [socket, quill]);

  const wrapperRef = useCallback(wrapper => {
    if (wrapper == null) return;

    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);
    const q = new Quill(editor, {
      theme: "snow",
      modules: {
        toolbar: {
          container: TOOLBAR_OPTIONS,
          handlers: {
            // Remove custom image handler
          }
        },
        cursors: true
      }
    });
    q.disable();
    q.setText("Loading...");
    setQuill(q);
  }, []);

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
  
    input.onchange = async () => {
      const file = input.files[0];
      if (file && quill) {
        const formData = new FormData();
        formData.append('image', file);
  
        try {
          // Upload image to server
          const res = await fetch('http://localhost:3001/upload', {
            method: 'POST',
            body: formData,
          });
          if (!res.ok) {
            throw new Error('Failed to upload image');
          }
          const data = await res.json();
          const imageUrl = data.url; // Get the URL from server response
  
          // Insert the image into the editor
          const range = quill.getSelection();
          if (range) {
            quill.insertEmbed(range.index, 'image', imageUrl, Quill.sources.USER);
            quill.setSelection(range.index + 1, Quill.sources.SILENT); // Move cursor to next position
          }
        } catch (error) {
          console.error('Error uploading image:', error);
        }
      }
    };
  };
  
  

  return (
    <div>
      <Header documentTitle={documentTitle} onSave={() => console.log('Save button clicked')} />
      <div className="container" ref={wrapperRef}></div>
    </div>
  );
}
