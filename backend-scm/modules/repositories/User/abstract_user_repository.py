from abc import ABC, abstractmethod


class UserRepository(ABC):

    @abstractmethod
    def get_user_by_email(self, email):
        pass

    @abstractmethod
    def get_user_by_id(self, user_id):
        pass

    @abstractmethod
    def create_user(self, user_data):
        pass

    @abstractmethod
    def create_new_activation_link(self, user_id):
        pass

    @abstractmethod
    def get_user_if_activation_link_valid(self, activation_code):
        pass

    @abstractmethod
    def activate_user(self, user_id):
        pass

    @abstractmethod
    def user_exists(self, email, phone_number, phone_number_country_code):
        pass

    @abstractmethod
    def get_user_session_from_session_token(self, session_token):
        pass

    @abstractmethod
    def create_new_session(self, user_id, client_id="scm-insights"):
        pass

    @abstractmethod
    def delete_session(self, user_id, client_id="scm-insights"):
        pass

    @abstractmethod
    def get_user_by_reset_token(self, token):
        pass

    @abstractmethod
    def delete_reset_token(self, token):
        pass

    @abstractmethod
    def update_password(self, user_id, new_hash_password):
        pass

    @abstractmethod
    def get_user_with_license_check(self, user_id):
        pass

    @abstractmethod
    def get_license_by_user_id(self, user_id):
        pass

    @abstractmethod
    def refresh_tokens(self, user_id):
        pass
