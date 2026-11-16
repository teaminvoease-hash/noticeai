import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import ClientPortalLayout from "./ClientPortalLayout";
import { fetchData, FileUpload } from "../../../helper/ApiCall";
import { BASE_URL_IMAGE, END_POINT, METHODS } from "../../../helper/helper";

const ClientDocuments = () => {
  const { userData } = useSelector((store) => store.userReducer);
  const [loading, setLoading] = useState(false);
  const [uploadingRequestFiles, setUploadingRequestFiles] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [uploadRequest, setUploadRequest] = useState(null);
  const [requestFiles, setRequestFiles] = useState([]);

  const clientId = useMemo(
    () => userData?._id || userData?.id || userData?.clientId || "",
    [userData]
  );

  const loadData = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const docResult = await fetchData(`${END_POINT.ClientPortalGetDocuments}?clientId=${encodeURIComponent(clientId)}`, METHODS.GET);
      setDocuments(docResult?.success ? docResult.data || [] : []);
    } catch (error) {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientId]);

  const lawyerRequests = useMemo(() => {
    return documents
      .filter((doc) => String(doc.requestedByRole || "").toLowerCase() === "lawyer")
      .map((doc) => ({
        ...doc,
        responseFiles: Array.isArray(doc.responseFiles) ? doc.responseFiles : [],
      }));
  }, [documents]);

  const handleRequestFileSelection = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      setRequestFiles([]);
      return;
    }

    const invalidFile = files.find((file) => !String(file.name).toLowerCase().endsWith(".pdf"));
    if (invalidFile) {
      Swal.fire({
        title: "Invalid File",
        text: "Please upload PDF files only",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      event.target.value = "";
      setRequestFiles([]);
      return;
    }

    setRequestFiles(files);
  };

  const handleUploadRequestDocuments = async () => {
    if (!uploadRequest?._id) return;
    if (requestFiles.length === 0) {
      Swal.fire({
        title: "No Files Selected",
        text: "Please select one or more PDF files",
        icon: "warning",
        confirmButtonColor: "#175c8f",
      });
      return;
    }

    setUploadingRequestFiles(true);
    try {
      const uploadedNames = [];

      for (const file of requestFiles) {
        const result = await FileUpload(file);
        if (!result?.success) {
          throw new Error(result?.message || "Could not upload one of the files");
        }
        uploadedNames.push(result.fileName || result.image || "");
      }

      const combinedFiles = [
        ...(Array.isArray(uploadRequest.responseFiles) ? uploadRequest.responseFiles : []),
        ...uploadedNames.filter(Boolean),
      ];

      const result = await fetchData(
        `${END_POINT.ClientPortalUpdateDocument}${uploadRequest._id}`,
        METHODS.PUT,
        {
          clientId,
          noticeId: uploadRequest.noticeId,
          type: uploadRequest.type,
          fileName: uploadRequest.fileName || "",
          clientEmail: uploadRequest.clientEmail || "",
          requestMessage: uploadRequest.requestMessage || "",
          requestedByRole: uploadRequest.requestedByRole || "lawyer",
          requestedById: uploadRequest.requestedById || "",
          responseFiles: combinedFiles,
          status: "received",
        }
      );

      if (result?.success) {
        Swal.fire({
          title: "Uploaded",
          text: "Requested documents uploaded successfully",
          icon: "success",
          confirmButtonColor: "#175c8f",
        });
        setUploadRequest(null);
        setRequestFiles([]);
        await loadData();
      } else {
        Swal.fire({
          title: "Upload Failed",
          text: result?.message || "Could not save requested documents",
          icon: "error",
          confirmButtonColor: "#175c8f",
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Upload Failed",
        text: error?.message || "Could not upload requested documents",
        icon: "error",
        confirmButtonColor: "#175c8f",
      });
    } finally {
      setUploadingRequestFiles(false);
    }
  };

  return (
    <ClientPortalLayout
      activeKey="documents"
      title="Documents"
      subtitle="View lawyer document requests and upload requested files."
      actions={<><Link className="btn btn-light" to="/client-my-notices">My Notices</Link><Link className="btn btn-light" to="/client-dashboard">Dashboard</Link></>}
    >
      <article className="table-panel">
        <div className="section-head">
          <h3>Lawyer Document Requests</h3>
          <p className="pagination-meta">Display only the document requests sent by your assigned lawyer.</p>
        </div>
        <div className="table-scroll">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Notice ID</th>
                <th>Document Type</th>
                <th>Message</th>
                <th>Uploaded Files</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="7">Loading lawyer requests...</td></tr> : null}
              {!loading && lawyerRequests.length === 0 ? <tr><td colSpan="7">No lawyer document requests found</td></tr> : null}
              {!loading && lawyerRequests.map((doc) => (
                <tr key={doc._id}>
                  <td>{doc.docId}</td>
                  <td>{doc.noticeId}</td>
                  <td>{doc.type}</td>
                  <td>{doc.requestMessage || "-"}</td>
                  <td>
                    {doc.responseFiles.length > 0 ? (
                      <div>
                        {doc.responseFiles.map((file) => (
                          <div key={file}>
                            <a className="tiny-btn" href={`${BASE_URL_IMAGE}${file}`} target="_blank" rel="noreferrer">
                              View
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      "No upload yet"
                    )}
                  </td>
                  <td>{doc.status || "sent"}</td>
                  <td>
                    <button className="tiny-btn" type="button" onClick={() => { setUploadRequest(doc); setRequestFiles([]); }}>
                      Upload
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="pagination-wrap">
        <p className="pagination-meta">Showing {lawyerRequests.length} of {lawyerRequests.length}</p>
        <div className="pagination"><span className="page-btn active">1</span></div>
      </div>

      {uploadRequest ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", display: "grid", placeItems: "center", zIndex: 1000 }}>
          <div className="form-panel" style={{ width: "min(720px, 92vw)", maxHeight: "88vh", overflowY: "auto" }}>
            <h3>Upload Requested Documents</h3>
            <form className="crud-form" onSubmit={(e) => { e.preventDefault(); handleUploadRequestDocuments(); }}>
              <label>Notice ID</label>
              <input type="text" value={uploadRequest.noticeId || ""} readOnly />

              <label>Requested Document Type</label>
              <input type="text" value={uploadRequest.type || ""} readOnly />

              <label>Request Message</label>
              <textarea value={uploadRequest.requestMessage || ""} readOnly />

              <label>Already Uploaded Files</label>
              <div>
                {Array.isArray(uploadRequest.responseFiles) && uploadRequest.responseFiles.length > 0 ? (
                  uploadRequest.responseFiles.map((file) => (
                    <div key={file} style={{ marginBottom: "8px" }}>
                      <a className="tiny-btn" href={`${BASE_URL_IMAGE}${file}`} target="_blank" rel="noreferrer">
                        View Uploaded File
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="pagination-meta">No uploaded files yet.</p>
                )}
              </div>

              <label>Upload PDF Documents</label>
              <input type="file" accept=".pdf" multiple onChange={handleRequestFileSelection} />
              {requestFiles.length > 0 ? (
                <p className="pagination-meta">Selected: {requestFiles.map((file) => file.name).join(", ")}</p>
              ) : null}

              <div className="crud-actions">
                <button type="submit" className="btn btn-primary" disabled={uploadingRequestFiles}>
                  {uploadingRequestFiles ? "Uploading..." : "Upload Documents"}
                </button>
                <button type="button" className="btn btn-light" onClick={() => { setUploadRequest(null); setRequestFiles([]); }}>
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </ClientPortalLayout>
  );
};

export default ClientDocuments;
