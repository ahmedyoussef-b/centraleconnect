import { notFound } from 'next/navigation';
import { getComponentById } from '@/lib/component-service';
import type { Component } from '@/types/db';
import { ComponentDetailView } from '@/components/component-detail-view';

export default async function ComponentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const component = (await getComponentById(params.id)) as Component;

  if (!component) {
    notFound();
  }

  return (
    <ComponentDetailView component={component} />
  );
}
