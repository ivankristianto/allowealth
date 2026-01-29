import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object Model for the Login page (/login).
 * Handles authentication flow and login form interactions.
 */
export class LoginPage extends BasePage {
  // Locators
  private readonly emailInput = '[data-testid="email-input"]';
  private readonly passwordInput = '[data-testid="password-input"]';
  private readonly loginButton = '[data-testid="login-btn"]';
  private readonly errorMessage = '[data-testid="login-error"]';

  /**
   * Navigate to the login page.
   */
  async gotoLogin(): Promise<void> {
    await this.navigateTo('/login');
  }

  /**
   * Fill email input field.
   * @param email - Email address to enter
   */
  async fillEmail(email: string) {
    await this.page.fill(this.emailInput, email);
  }

  /**
   * Fill password input field.
   * @param password - Password to enter
   */
  async fillPassword(password: string) {
    await this.page.fill(this.passwordInput, password);
  }

  /**
   * Click the login button.
   */
  async clickLogin() {
    await this.page.click(this.loginButton);
  }

  /**
   * Perform complete login flow: fill credentials and submit.
   * Waits for redirect to dashboard on success.
   * @param email - User email address
   * @param password - User password
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLogin();
    // Wait for redirect to dashboard (indicates successful login)
    await this.page.waitForURL('**/', { timeout: 10000 });
  }

  /**
   * Assert that an error message is displayed on the login form.
   * @param message - Expected error message text
   */
  async expectError(message: string) {
    const error = this.page.locator(this.errorMessage);
    await expect(error).toBeVisible();
    await expect(error).toContainText(message);
  }

  /**
   * Assert that the email input is visible and ready for interaction.
   */
  async expectEmailInputVisible() {
    await expect(this.page.locator(this.emailInput)).toBeVisible();
  }

  /**
   * Assert that the login button is visible.
   */
  async expectLoginButtonVisible() {
    await expect(this.page.locator(this.loginButton)).toBeVisible();
  }
}
