export type NavLink = {
  href: string;
  label: string;
  exact?: boolean;
};

export const NAV_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Visão geral", exact: true },
  { href: "/dashboard/conversas", label: "Conversas" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/produtos", label: "Produtos e serviços" },
  { href: "/dashboard/conhecimento", label: "Base de conhecimento" },
  { href: "/dashboard/empresa", label: "Empresa" },
  { href: "/dashboard/configuracoes", label: "Configurações" },
];
