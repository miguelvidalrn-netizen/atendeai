"use client";

import { useActionState, useRef, useState } from "react";
import { InlineError, useRowAction } from "@/components/ui/inline-error";
import {
  createProductAction,
  deleteProductAction,
  toggleProductActiveAction,
  type ProductFormState,
} from "@/lib/actions/products";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge, EmptyState } from "@/components/ui/primitives";

export type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  type: "PRODUTO" | "SERVICO";
  active: boolean;
};

const initialState: ProductFormState = {};

function formatPrice(price: string | null) {
  if (!price) return "Sob consulta";
  const value = Number(price);
  if (Number.isNaN(value)) return "Sob consulta";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProductRowItem({ product }: { product: ProductRow }) {
  const { isPending, error, run } = useRowAction();

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-ink">{product.name}</span>
          <Badge tone={product.type === "SERVICO" ? "info" : "neutral"}>
            {product.type === "SERVICO" ? "Serviço" : "Produto"}
          </Badge>
          {!product.active && <Badge tone="neutral">Inativo</Badge>}
        </div>
        {product.description && (
          <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
            {product.description}
          </p>
        )}
        <InlineError message={error} />
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <span className="font-display text-lg text-ink">
          {formatPrice(product.price)}
        </span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => toggleProductActiveAction(product.id, !product.active))}
          className="text-sm font-medium text-ink-soft hover:text-ink disabled:opacity-60"
        >
          {product.active ? "Desativar" : "Ativar"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => deleteProductAction(product.id))}
          className="text-sm font-medium text-ink-soft hover:text-coral-dark disabled:opacity-60"
        >
          Excluir
        </button>
      </div>
    </li>
  );
}

export function ProductManager({ products }: { products: ProductRow[] }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Os efeitos de sucesso rodam dentro da action (evento), não em useEffect,
  // evitando renders em cascata.
  const [state, formAction] = useActionState(
    async (prev: ProductFormState, formData: FormData) => {
      const result = await createProductAction(prev, formData);
      if (result.success) {
        formRef.current?.reset();
        setOpen(false);
      }
      return result;
    },
    initialState
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <button
          onClick={() => setOpen((value) => !value)}
          className="rounded-full bg-coral px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-coral-dark"
        >
          {open ? "Cancelar" : "Adicionar item"}
        </button>
      </div>

      {open && (
        <div className="rounded-2xl border border-line bg-paper-raised p-6">
          <h2 className="font-display text-lg text-ink">
            Novo produto ou serviço
          </h2>
          <form
            ref={formRef}
            action={formAction}
            className="mt-5 flex flex-col gap-4"
          >
            <Field
              label="Nome"
              name="name"
              placeholder="Ex: Corte de cabelo"
              error={state.fieldErrors?.name}
              required
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Preço (R$)"
                name="price"
                placeholder="89,90"
                hint="Deixe vazio para 'sob consulta'."
                error={state.fieldErrors?.price}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="type" className="text-sm font-medium text-ink">
                  Tipo
                </label>
                <select
                  id="type"
                  name="type"
                  defaultValue="PRODUTO"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:border-violet focus:outline-none"
                >
                  <option value="PRODUTO">Produto</option>
                  <option value="SERVICO">Serviço</option>
                </select>
              </div>
            </div>

            <Field
              as="textarea"
              label="Descrição"
              name="description"
              placeholder="Detalhes que ajudam a IA a explicar o item ao cliente."
              error={state.fieldErrors?.description}
            />

            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                name="active"
                defaultChecked
                className="h-4 w-4 rounded border-line"
              />
              Disponível para venda
            </label>

            {state.error && !state.fieldErrors && (
              <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral-dark">
                {state.error}
              </p>
            )}

            <SubmitButton pendingLabel="Salvando...">Salvar item</SubmitButton>
          </form>
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState
          title="Nenhum produto ou serviço cadastrado"
          description="Cadastre o que você vende com preço e descrição. A IA usa esses dados para responder os clientes com informações corretas."
        />
      ) : (
        <div className="rounded-2xl border border-line bg-paper-raised px-6">
          <ul className="divide-y divide-line">
            {products.map((product) => (
              <ProductRowItem key={product.id} product={product} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
