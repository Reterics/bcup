import { useState, useEffect } from "react";

interface BackupElement {
    file: string;
    timestamp: string;
    collection?: string
}


const API = '/api/';
const BackupManager = () => {
    const [backups, setBackups] = useState<BackupElement[]>([]);

    useEffect(() => {
        fetch(API + '?action=list') // Call PHP API
            .then((res) => res.json())
            .then((data) => setBackups(data.data.map((d: BackupElement)=>({...d, collection: d.collection || d.file.split('_')[0]}))))
            .catch((err) => console.error(err));
    }, []);

    const deleteBackup = async (file: string) => {
        await fetch(API + '?action=delete', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ file }),
        });
        setBackups(backups.filter((b) => b.file !== file));
    };

    return (
        <div className="p-6">
            <h1 className="text-xl font-bold">Backup Manager</h1>
            <table>
                <thead>
                <tr>
                    <th>Collection</th>
                    <th>Backup File</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {backups.map((backup, i) => (
                    <tr key={i}>
                        <td>{backup.collection}</td>
                        <td>{backup.file}</td>
                        <td>
                            <button onClick={() => deleteBackup(backup.file)}>Delete</button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};

export default BackupManager;
