from abc import ABC, abstractmethod


class AdminRepository(ABC):

    @abstractmethod
    def create_tables(self):
        pass

    @abstractmethod
    def drop_tables(self):
        pass

    @abstractmethod
    def get_all_users(self, sort_order="asc"):
        pass

    @abstractmethod
    def is_user_admin(self, user_id):
        pass

    @abstractmethod
    def update_user_activation_status(self, user_id, activation_status):
        pass

    @abstractmethod
    def delete_user(self, user_id):
        pass

    @abstractmethod
    def get_license_by_type(self, license_type):
        pass

    @abstractmethod
    def get_all_licenses(self):
        pass

    @abstractmethod
    def create_license(self, license_type, license_data):
        pass

    @abstractmethod
    def delete_license(self, license_type):
        pass

    @abstractmethod
    def assign_license(self, user_id, license_type):
        pass

    def get_all_hscodes(self):
        """Return list of {code, description}. Optional override for DB-backed HS codes."""
        return []
