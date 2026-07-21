export interface Employee {
  user_id: string;
  roles: string[];
  department: string;
  unit: string;
  status: string;
  created_at: string;
}

export interface RegisterEmployeePayload {
  user_id: string;
  roles: string[];
  department: string;
  unit: string;
  password: string;
  status: string;
}

export type UpdateEmployeePayload = Omit<RegisterEmployeePayload, "password">;

export interface ChangeEmployeePasswordPayload {
  old_password: string;
  new_password: string;
}

export interface EmployeeMutationResponse {
  message: string;
  data: Employee;
}
