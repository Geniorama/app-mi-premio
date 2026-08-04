"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Panel,
  DataTable,
  Field,
  Spinner,
  ErrorNote,
  formatDate,
  inputClass,
  type Column,
} from "@/components/admin/ui";
import {
  assignableRoles,
  roleLabel,
  roleRank,
  DEFAULT_ADMIN_ROLE,
} from "@/lib/admin-roles";

interface AdminUserRow {
  _id: string;
  email: string;
  name?: string;
  role?: string;
  active?: boolean;
  _createdAt?: string;
}

interface UsuariosViewProps {
  /** Rol de quien está usando el panel: acota qué puede asignar */
  actorRole: string;
  actorId: string;
}

export default function UsuariosView({ actorRole, actorId }: UsuariosViewProps) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: DEFAULT_ADMIN_ROLE as string,
  });
  const [creating, setCreating] = useState(false);

  const roles = assignableRoles(actorRole);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users");
      if (response.status === 401 || response.status === 403) {
        setError("No tienes permiso para gestionar administradores.");
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Error al cargar");
      setUsers(data.users ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "No se pudo crear el administrador");
        return;
      }

      setNotice(
        `${form.name} ya puede entrar al panel con ${form.email.toLowerCase()}.`
      );
      setForm({ name: "", email: "", role: DEFAULT_ADMIN_ROLE });
      await load();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setCreating(false);
    }
  };

  const update = async (id: string, patch: Record<string, unknown>) => {
    setSaving(id);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "No se pudo actualizar");
        return;
      }
      await load();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSaving(null);
    }
  };

  /** Una fila es editable si no eres tú y no tiene más privilegio que tú. */
  const editable = (user: AdminUserRow) =>
    user._id !== actorId &&
    roleRank(user.role ?? DEFAULT_ADMIN_ROLE) >= roleRank(actorRole);

  const columns: Column<AdminUserRow>[] = [
    {
      key: "name",
      header: "Administrador",
      render: (user) => (
        <div className="max-w-72">
          <p className="truncate font-medium text-[#0b0b0b]">
            {user.name || "Sin nombre"}
            {user._id === actorId && (
              <span className="ml-2 text-xs font-normal text-[#898781]">(tú)</span>
            )}
          </p>
          <p className="truncate text-xs text-[#52514e]">{user.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rol",
      render: (user) =>
        editable(user) ? (
          <select
            className={inputClass}
            value={user.role ?? DEFAULT_ADMIN_ROLE}
            disabled={saving === user._id}
            onChange={(event) => update(user._id, { role: event.target.value })}
          >
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm text-[#0b0b0b]">
            {roleLabel(user.role ?? DEFAULT_ADMIN_ROLE)}
          </span>
        ),
    },
    {
      key: "active",
      header: "Estado",
      render: (user) => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: user.active === false ? "#898781" : "#0ca30c" }}
          />
          {user.active === false ? "Inactivo" : "Activo"}
        </span>
      ),
    },
    {
      key: "creado",
      header: "Alta",
      render: (user) => formatDate(user._createdAt),
    },
    {
      key: "acciones",
      header: "",
      render: (user) =>
        editable(user) ? (
          <button
            type="button"
            disabled={saving === user._id}
            onClick={() => update(user._id, { active: user.active === false })}
            className="cursor-pointer rounded-lg border border-black/15 px-3 py-1.5 text-xs font-medium transition-colors hover:border-custom-green hover:text-custom-green disabled:opacity-50"
          >
            {saving === user._id
              ? "Guardando…"
              : user.active === false
                ? "Reactivar"
                : "Desactivar"}
          </button>
        ) : (
          <span className="text-xs text-[#898781]">—</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {error && <ErrorNote message={error} />}
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-custom-green/30 bg-custom-green/5 px-4 py-3 text-sm text-custom-green"
        >
          {notice}
        </p>
      )}

      <Panel
        title="Nuevo administrador"
        description="Recibirá un código de acceso por correo cuando entre a /admin. No necesita estar registrado en Zoho."
      >
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <Field label="Nombre">
            <input
              type="text"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Nombre y apellido"
              className={`${inputClass} min-w-52`}
            />
          </Field>
          <Field label="Correo electrónico">
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="persona@empresa.com"
              className={`${inputClass} min-w-64`}
            />
          </Field>
          <Field label="Rol">
            <select
              className={inputClass}
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
            >
              {roles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="submit"
            disabled={creating}
            className="h-9 cursor-pointer rounded-lg bg-custom-green px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {creating ? "Creando…" : "Crear administrador"}
          </button>
        </form>

        <ul className="mt-4 flex flex-col gap-1 border-t border-black/10 pt-3 text-xs text-[#52514e]">
          {roles.map((role) => (
            <li key={role.value}>
              <span className="font-medium text-[#0b0b0b]">{role.label}:</span>{" "}
              {role.description}
            </li>
          ))}
        </ul>
      </Panel>

      {loading && !users.length ? (
        <Spinner label="Cargando administradores…" />
      ) : (
        <Panel
          title="Administradores"
          description="Desactivar revoca el acceso de inmediato, sin esperar a que expire su sesión."
        >
          <DataTable
            columns={columns}
            rows={users}
            rowKey={(user) => user._id}
            emptyMessage="Todavía no hay administradores."
          />
        </Panel>
      )}
    </div>
  );
}
