#include "Matrix.h"
#include "Utils.h"
#include <sstream>
using namespace std;

void Matrix::Init(int rows, int cols) {
	this->rows = rows;
	this->cols = cols;
	self = new float*[rows];
	for (int i = 0; i < rows; i++)
		self[i] = new float[cols]();
}
void Matrix::Copy(const Matrix& other) {
	for (int i = 0; i < rows; i++)
		for (int j = 0; j < cols; j++)
			self[i][j] = other[i][j];
}
// Matrix::Matrix() {
// 	self = nullptr;
// 	rows = 0, cols = 0;
// }
Matrix::Matrix(int rows, int cols, float** array) {
    if (array) {
		this->rows = rows;
		this->cols = cols;
		this->self = array;
	}
	else
		Init(rows, cols);
}
Matrix::Matrix(const Matrix& other) : Matrix::Matrix(other.rows, other.cols) {
	Copy(other);
}
Matrix::~Matrix() {
	if (self)
		delete[] self;
	return;
}

int Matrix::Rows() { return rows; }
int Matrix::Cols() { return cols; }

void Matrix::Fill1() {
	for (int i = 0; i < rows; i++)
		self[i][i] = 1;
}
void Matrix::Manipulate(Matrix& m, int toBeAdded, int addTo, float k) {
	for (int i = 0; i < m.cols; i++)
		m[addTo][i] += m[toBeAdded][i] * k;
}
void Matrix::Manipulate(Matrix& m, Matrix& pair, int toBeAdded, int addTo, float k) {
	Manipulate(m, toBeAdded, addTo, k);
	Manipulate(pair, toBeAdded, addTo, k);
}
void Matrix::Manipulate(Matrix& m, int toChange, float k) {
	for (int i = 0; i < m.cols; i++)
		m[toChange][i] *= k;
}
void Matrix::Manipulate(Matrix& m, Matrix& pair, int toChange, float k) {
	Manipulate(m, toChange, k);
	Manipulate(pair, toChange, k);
}

void Matrix::Print(int roundTo, string* output) {
	stringstream ss;
	string t;
	for (int i = 0; i < rows; i++) {
		for (int j = 0; j < cols; j++) {
			ss << Utils::RoundTo(self[i][j], roundTo);
			if (j < cols - 1)
				ss << ' ';
		}
		if (i < rows - 1)
			ss << '\n';
	}
	t = string(istreambuf_iterator<char>(ss), {});
	if (output)
		*output = t;
	else
		cout << t << endl;
}

Matrix Matrix::Cropped(int row, int col) {
	Matrix cropped = Matrix(rows - 1, cols - 1);
	int k = 0;
	for (int i = 0; i < rows; i++)
		for (int j = 0; j < cols; j++)
			if (i != row && j != col) {
				cropped[k / (rows - 1)][k % (cols - 1)] = self[i][j];
				k++;
			}
	return cropped;
}
Matrix Matrix::Transposed() {
	Matrix result = Matrix(cols, rows);
	for (int i = 0; i < rows; i++)
		for (int j = 0; j < cols; j++)
			result[j][i] = self[i][j];
    return result;
}
Matrix& Matrix::operator=(const Matrix& other) {
	Init(other.rows, other.cols);
	Copy(other);
	return *this;
}

Matrix Matrix::operator-() {
	Matrix copy = Matrix(*this), result = Matrix(rows, cols); // we're gonna manipulate 'em in pairs
	result.Fill1();										// init

	for (int i = 0; i < rows; i++) { // change main diag to 1, and everything beneath to 0
		if (copy[i][i] != 0)
			Matrix::Manipulate(copy, result, i, 1 / copy[i][i]);
		for (int j = i + 1; j < cols; j++)
			Matrix::Manipulate(copy, result, i, j, -copy[j][i]);
	}

	for (int i = rows - 1; i > 0; i--) // set everything above main diag to 0
		for (int j = i - 1; j >= 0; j--)
			Matrix::Manipulate(copy, result, i, j, -copy[j][i]);
	return result;
}
Matrix Matrix::operator*(const float& a) {
	Matrix result = Matrix(*this);
	for (int i = 0; i < rows; i++)
		for (int j = 0; j < cols; j++)
			result[i][j] *= a;
	return result;
}
Matrix Matrix::operator*(const Matrix& other) {
	Matrix result = Matrix(rows, other.cols);
	for (int i = 0; i < rows; i++)
		for (int j = 0; j < other.cols; j++)
			for (int k = 0; k < cols; k++)
				result[i][j] += self[i][k] * other[k][j];
	return result;
}
Matrix Matrix::operator/(const float& a) {
	return (*this) * (1 / a);
}
float* Matrix::operator[](const int& index) const {
    return self[index];
}

float Matrix::Det() {
	if (rows == 1)
		return self[0][0];
	if (rows == 2)
		return self[0][0] * self[1][1] - self[1][0] * self[0][1];

	float det = 0;
	for (int i = 0; i < rows; i++)
		det += (i % 2 == 0 ? 1 : -1) * self[i][0] * Cropped(i, 0).Det();

	return det;
}