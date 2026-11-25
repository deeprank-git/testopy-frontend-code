import axiosClient from "@/api/axiosClient";

export async function getCategories() {
  const res = await axiosClient.get("/categories");
  return res.data;
}

export async function getCategoryById(id: string) {
  const res = await axiosClient.get(`/categories/${id}`);
  return res.data;
}

export type CategoryInput = {
  name: string;
  description?: string;
  imageFile?: File | null;
  order?: number;
};

// Admin create/update are multipart: the backend reads the image from the
// `categoryImage` multer field (routes/categoryAdminRoutes.js).
function toCategoryFormData(input: Partial<CategoryInput>) {
  const fd = new FormData();
  if (input.name !== undefined) fd.append("name", input.name);
  if (input.description !== undefined) fd.append("description", input.description);
  if (input.order !== undefined) fd.append("order", String(input.order));
  if (input.imageFile) fd.append("categoryImage", input.imageFile);
  return fd;
}

/** Admin-only: all categories (incl. archived) with description, isActive, seriesCount. */
export async function getAdminCategories() {
  const res = await axiosClient.get("/categories", { params: { admin: "true" } });
  return res.data;
}

export async function createCategory(input: CategoryInput) {
  const res = await axiosClient.post("/admin/categories", toCategoryFormData(input));
  return res.data;
}

export async function updateCategory(id: string, input: Partial<CategoryInput>) {
  const res = await axiosClient.patch(`/admin/categories/${id}`, toCategoryFormData(input));
  return res.data;
}

/** Admin-only: persist display sequence — `ids` in the order they should appear. */
export async function reorderCategories(ids: string[]) {
  const res = await axiosClient.patch("/admin/categories/reorder", { ids });
  return res.data;
}

export async function restoreCategory(id: string) {
  const res = await axiosClient.patch(`/admin/categories/${id}`, { isActive: true });
  return res.data;
}

export async function deleteCategory(id: string) {
  const res = await axiosClient.delete(`/admin/categories/${id}`);
  return res.data;
}
