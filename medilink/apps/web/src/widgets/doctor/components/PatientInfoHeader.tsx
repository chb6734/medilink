import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Droplet,
  User as UserIcon,
  Ruler,
  Weight,
} from "lucide-react";
import type { DoctorPatient } from "../lib/types";
import { COLORS, GRADIENTS } from "../lib/constants";

interface PatientInfoHeaderProps {
  patient: DoctorPatient;
  adherenceRate: number;
  latestPrescriptionDate: string | null;
}

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}

function StatCard({ icon, iconBg, label, value }: StatCardProps) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.15)",
        borderRadius: "14px",
        padding: "16px 12px",
        textAlign: "center",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.2)",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 10px",
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: "0.75rem",
          opacity: 0.85,
          marginBottom: "6px",
          fontWeight: "600",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "1.25rem", fontWeight: "700" }}>{value}</div>
    </div>
  );
}

export function PatientInfoHeader({
  patient,
  adherenceRate,
  latestPrescriptionDate,
}: PatientInfoHeaderProps) {
  return (
    <div
      style={{
        background: GRADIENTS.primary,
        padding: "24px 24px 32px",
        color: "white",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        borderBottomLeftRadius: "32px",
        borderBottomRightRadius: "32px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "28px",
          }}
        >
          <h1
            style={{
              color: "white",
              fontSize: "1.5rem",
              marginBottom: 0,
              fontWeight: "700",
            }}
          >
            환자 진료 요약
          </h1>
          <div
            style={{
              background: "rgba(255,255,255,0.2)",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "0.875rem",
              fontWeight: "600",
              backdropFilter: "blur(10px)",
            }}
          >
            연속진료
          </div>
        </div>

        {/* Patient Avatar and Name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
            paddingBottom: "24px",
            borderBottom: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              background: GRADIENTS.avatar,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "3px solid rgba(255,255,255,0.5)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            <UserIcon className="w-9 h-9" style={{ color: "white" }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2
              style={{
                color: "white",
                fontSize: "1.75rem",
                marginBottom: "4px",
                fontWeight: "700",
              }}
            >
              {patient.name}
            </h2>
            <p style={{ opacity: 0.9, fontSize: "0.9375rem", marginBottom: 0 }}>
              {patient.phone}
            </p>
          </div>
        </div>

        {/* Patient Stats Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
          }}
        >
          <StatCard
            icon={<Droplet className="w-5 h-5" style={{ color: "white" }} />}
            iconBg={COLORS.blood}
            label="혈액형"
            value={patient.bloodType || "N/A"}
          />
          <StatCard
            icon={<Ruler className="w-5 h-5" style={{ color: "white" }} />}
            iconBg={COLORS.height}
            label="키"
            value={patient.height ? `${patient.height}cm` : "N/A"}
          />
          <StatCard
            icon={<Weight className="w-5 h-5" style={{ color: "white" }} />}
            iconBg={COLORS.weight}
            label="몸무게"
            value={patient.weight ? `${patient.weight}kg` : "N/A"}
          />
          <StatCard
            icon={<UserIcon className="w-5 h-5" style={{ color: "white" }} />}
            iconBg={COLORS.age}
            label="나이"
            value={patient.age ? `${patient.age}세` : "N/A"}
          />
          <StatCard
            icon={
              <CheckCircle className="w-5 h-5" style={{ color: "white" }} />
            }
            iconBg={COLORS.weight}
            label="복약순응도"
            value={`${adherenceRate}%`}
          />
          <StatCard
            icon={<Calendar className="w-5 h-5" style={{ color: "white" }} />}
            iconBg={COLORS.calendar}
            label="최근 처방"
            value={latestPrescriptionDate || "없음"}
          />
        </div>

        {/* Allergies Alert */}
        {patient.allergies && patient.allergies !== "없음" && (
          <div
            style={{
              marginTop: "16px",
              padding: "14px 16px",
              background: "rgba(239, 68, 68, 0.2)",
              borderRadius: "14px",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <AlertCircle
              className="w-5 h-5"
              style={{ color: "#FEE2E2", flexShrink: 0, marginTop: "2px" }}
            />
            <div>
              <div
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: "700",
                  color: "#FEE2E2",
                  marginBottom: "4px",
                }}
              >
                알러지 주의
              </div>
              <div
                style={{
                  fontSize: "0.9375rem",
                  color: "white",
                  fontWeight: "600",
                  lineHeight: "1.5",
                }}
              >
                {patient.allergies}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
