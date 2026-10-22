"use client";

import type { UserProfile } from "@/types";
import styles from "./OrgChart.module.css";

function roleLabel(role: UserProfile["role"]) {
  return role === "BOSS" ? "Patron" : role === "GERANT" ? "Gérant" : "Agent";
}

function MemberCard({ member, accent }: { member: UserProfile; accent: "boss" | "manager" | "staff" }) {
  const name = member.full_name?.trim() || member.email;
  return (
    <article className={`${styles.card} ${styles[accent]}`}>
      <div className={styles.avatar}>
        {member.avatar_url ? (
          <img src={member.avatar_url} alt={`Photo de ${name}`} referrerPolicy="no-referrer" />
        ) : (
          <span>{name.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        <p className="text-xs text-ink-soft">{roleLabel(member.role)}</p>
        {!member.is_active && <p className="text-[11px] text-error-text">Accès révoqué</p>}
      </div>
    </article>
  );
}

export default function OrgChart({ members }: { members: UserProfile[] }) {
  const boss = members.find((member) => member.role === "BOSS");
  const managers = members.filter((member) => member.role === "GERANT");
  const staff = members.filter((member) => member.role === "STAFF");
  const assignedStaff = new Set(staff.filter((member) => member.manager_id).map((member) => member.id));
  const unassigned = staff.filter((member) => !assignedStaff.has(member.id));

  return (
    <div className={styles.viewport}>
      <div className={styles.chart}>
        {boss && <div className={styles.root}><MemberCard member={boss} accent="boss" /></div>}
        <div className={styles.trunk} />
        {managers.length > 0 ? (
          <div className={styles.managerRow}>
            {managers.map((manager) => {
              const managerStaff = staff.filter((member) => member.manager_id === manager.id);
              return (
                <section key={manager.id} className={styles.managerBranch}>
                  <div className={styles.managerConnector} />
                  <MemberCard member={manager} accent="manager" />
                  {managerStaff.length > 0 && <div className={styles.staffRow}>{managerStaff.map((member) => <div key={member.id} className={styles.staffBranch}><div className={styles.staffConnector} /><MemberCard member={member} accent="staff" /></div>)}</div>}
                  {managerStaff.length === 0 && <p className={styles.empty}>Aucun Agent rattaché</p>}
                </section>
              );
            })}
          </div>
        ) : (
          <p className={styles.empty}>Aucun gérant nommé pour le moment.</p>
        )}
        {unassigned.length > 0 && <section className={styles.unassigned}><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">Agent à affecter</p><div className={styles.unassignedRow}>{unassigned.map((member) => <MemberCard key={member.id} member={member} accent="staff" />)}</div></section>}
      </div>
    </div>
  );
}
