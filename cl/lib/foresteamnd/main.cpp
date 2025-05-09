#include "src/Quaternion.h"
#include "src/Matrix.h"
#include "src/Utils.h"
#include "src/Stack.tcc"
#include "src/TCPClient.h"
#include <math.h>
#include <iostream>
#include <list>
using namespace std;

int total = 0, passed = 0;
void Test(string prefix, string a, string b) {
	total++;
	bool ok = a.compare(b.c_str()) == 0;
	passed += ok;
	printf("%s: \u001b[37;1m%s\u001b[0m \u001b[36mVs\u001b[0m \u001b[37;1m%s\u001b[0m. %s\n", prefix.c_str(), a.c_str(), b.c_str(), ok ? "\u001b[32mOk\u001b[0m" : "\u001b[31mFailed\u001b[0m");
}

int main(int, char**) {
	printf("*Tests*\n");

	Vector axis = Vector(0, 1, 0);
	Vector target = Vector(1, 0, 0);
	Quaternion q = Quaternion(axis, 90 * DEG2RAD);
	printf("Quaternion tests\n");
	Test("'axis'", axis.ToString().c_str(), "Vector3D(0, 1, 0)");
	Test("'target'", target.ToString().c_str(), "Vector3D(1, 0, 0)");
	Test("'q'", q.ToString().c_str(), "Quaternion(0, 0.707107, 0, 0.707107)");
	Test("'target', rotated 0deg", (Quaternion() * target).ToString(), "Vector3D(1, 0, 0)");
	target = (q * target);
	Test("'target', rotated around 'axis' 90deg", target.ToString().c_str(), "Vector3D(0, 0, -1)");
	Test("'target', rotated back 90deg", (target * Quaternion(axis, -acos(0))).ToString().c_str(), "Vector3D(1, 0, 0)");

	Stack<Vector> vectors;
	vectors.Push(Vector(1, 2, 3));
	vectors.Push(Vector(4, 5, 6));
	vectors.Push(Vector(7, 8, 9));
	vectors.Rot();
	printf("Stack tests\n");
	Test("'vectors', rotated once[2], pop", vectors.Pop().ToString(), "Vector3D(1, 2, 3)");
	vectors.Drop();
	printf("'vectors', rotated once[1], drop\n");
	Test("'vectors', rotated once[0], peek", vectors.Peek()->ToString(), "Vector3D(4, 5, 6)");
	Test("'vectors', rotated once[0], pop", vectors.Pop().ToString(), "Vector3D(4, 5, 6)");
	Test("Trim", '"' + Utils::String::Trimmed("   Hello there! ") + '"', "\"Hello there!\"");
	Test("Trim", Utils::String::Trimmed("  "), "");
	Test("Align center", '"' + Utils::String::AlignedCenter(" Seems goood  ", 19) + '"', "\"    Seems goood    \"");
	Test("Align right", '"' + Utils::String::AlignedRight(" Seems goood  ", 19) + '"', "\"        Seems goood\"");
	Test("Split, join", Utils::String::Join<string>(Utils::String::Split("1 2 3", " "), ", "), "1, 2, 3");
	Test("Convert to string", Utils::String::Convert(1.2345), "1.2345");
	Matrix m = Matrix(3, 1);
	for (int i = 0; i < 3; i++)
		m[i][0] = i;
	string tMatrix;
	m.Transposed().Print(2, &tMatrix);
	Test("Matrix transpose", tMatrix, "0 1 2");

	printf("%s\n", TCPClient::ResolveIP("127.0.0.1").c_str());
	TCPClient client = TCPClient("127.0.0.1", 1337, true);
	client.SendData("Welcome to the club, buddy!");
	std::cout << client.ReceiveData() << endl;

	printf("%sTests completed\u001b[0m. %i of %i passed.\n", passed == total ? "\u001b[32m" : "\u001b[33m", passed, total);

	return 0;
}
