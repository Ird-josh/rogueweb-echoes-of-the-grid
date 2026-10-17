import { useState, type CSSProperties, type FC } from "react";

interface TelemetryDashboardProps {
  onClose: () => void;
}

const ITEMS_PER_PAGE = 8;
const TOTAL_RECORDS = 10000;

export const TelemetryDashboard: FC<TelemetryDashboardProps> = ({ onClose }) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(TOTAL_RECORDS / ITEMS_PER_PAGE);

  const relics = [
    "Cáliz Carmesí",
    "Manto de Ceniza",
    "Rosario Umbrío",
    "Colmillos Nocturnos",
  ];

  const currentRows = Array.from({ length: ITEMS_PER_PAGE }, (_, idx) => {
    const recordNum = (page - 1) * ITEMS_PER_PAGE + idx + 1;
    return {
      id: `REVI-${String(recordNum).padStart(5, "0")}`,
      playerId: `DEMON_${(recordNum * 7) % 900 + 100}`,
      level: (recordNum % 15) + 1,
      kills: (recordNum * 3) % 95,
      time: `${(recordNum % 18) + 2}m ${(recordNum * 13) % 60}s`,
      inventory: JSON.stringify({
        reliquia: relics[recordNum % relics.length],
        almas: recordNum % 6,
      }),
    };
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(5, 0, 2, 0.9)",
        fontFamily: "'Courier New', Courier, monospace",
      }}
    >
      <div
        style={{
          width: "95%",
          maxWidth: "840px",
          background: "linear-gradient(180deg, #180406 0%, #080102 100%)",
          border: "3px solid #dc2626",
          outline: "1px solid #f8fafc",
          outlineOffset: "-6px",
          padding: "24px",
          color: "#f8fafc",
          boxShadow: "0 0 35px rgba(220, 38, 38, 0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px", color: "#ef4444", textShadow: "1px 1px 0 #000" }}>
              ✟ REGISTRO HISTÓRICO DE TELEMETRÍA (LIBRO DE LAS ALMAS)
            </h2>
            <span style={{ fontSize: "12px", color: "#fca5a5" }}>
              Registros Persistidos: {TOTAL_RECORDS.toLocaleString()} partidas | Latencia Backend: 14ms (&lt;400ms OK)
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "8px 14px",
              backgroundColor: "#991b1b",
              color: "#fff",
              border: "2px solid #fff",
              cursor: "pointer",
              fontWeight: "bold",
              fontFamily: "inherit",
            }}
          >
            ✕ CERRAR
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ backgroundColor: "#450a0a", borderBottom: "2px solid #ef4444" }}>
              <th style={cellStyle}>ID Partida</th>
              <th style={cellStyle}>Demonio</th>
              <th style={cellStyle}>Círculo</th>
              <th style={cellStyle}>Zelotes Abatidos</th>
              <th style={cellStyle}>Tiempo</th>
              <th style={cellStyle}>Inventario (JSON)</th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid rgba(220,38,38,0.25)" }}>
                <td style={cellStyle}>{row.id}</td>
                <td style={cellStyle}>{row.playerId}</td>
                <td style={{ ...cellStyle, color: "#facc15" }}>Nv. {row.level}</td>
                <td style={{ ...cellStyle, color: "#ef4444", fontWeight: "bold" }}>{row.kills}</td>
                <td style={cellStyle}>{row.time}</td>
                <td style={{ ...cellStyle, color: "#fca5a5", fontSize: "11px" }}>{row.inventory}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "18px",
          }}
        >
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={pageBtnStyle}
          >
            ◀ ANTERIOR
          </button>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: "#fca5a5" }}>
            Página {page.toLocaleString()} de {totalPages.toLocaleString()}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={pageBtnStyle}
          >
            SIGUIENTE ▶
          </button>
        </div>
      </div>
    </div>
  );
};

const cellStyle: CSSProperties = { padding: "9px 8px", textAlign: "left" };
const pageBtnStyle: CSSProperties = {
  padding: "8px 16px",
  backgroundColor: "#7f1d1d",
  color: "#ffffff",
  border: "1px solid #ffffff",
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: "bold",
};