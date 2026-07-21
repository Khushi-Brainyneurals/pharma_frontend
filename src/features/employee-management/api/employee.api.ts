import { httpClient } from "../../../shared/api/httpClient";
import type {
  ChangeEmployeePasswordPayload,
  Employee,
  EmployeeMutationResponse,
  RegisterEmployeePayload,
  UpdateEmployeePayload,
} from "./employee.types";

export async function getEmployees(): Promise<Employee[]> {
  const response = await httpClient.get<Employee[]>("/employee");
  return response.data;
}
export async function getEmployeeById(userId: string): Promise<Employee> {
  const response = await httpClient.get<Employee>(
    `/employee/${encodeURIComponent(userId)}`,
  );
  return response.data;
}
export async function registerEmployee(payload: RegisterEmployeePayload) {
  const response = await httpClient.post<EmployeeMutationResponse>(
    "/employee/register",
    payload,
  );
  return response.data;
}
export async function updateEmployee(
  originalUserId: string,
  payload: UpdateEmployeePayload,
) {
  const response = await httpClient.patch<EmployeeMutationResponse>(
    `/employee/${encodeURIComponent(originalUserId)}/update`,
    payload,
  );
  return response.data;
}
export async function deleteEmployee(userId: string): Promise<string> {
  const response = await httpClient.delete<string>(
    `/employee/${encodeURIComponent(userId)}/delete`,
  );
  return response.data;
}
export async function changeEmployeePassword(
  userId: string,
  payload: ChangeEmployeePasswordPayload,
): Promise<string> {
  const response = await httpClient.post<string>(
    `/employee/${encodeURIComponent(userId)}/change-password`,
    payload,
  );
  return response.data;
}
